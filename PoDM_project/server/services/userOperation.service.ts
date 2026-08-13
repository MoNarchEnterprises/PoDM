import { PaymentIntent, PaymentIntentResult, UserOperation } from '../../common/types/EmbeddedWallet';
import { getOrCreateSmartAccount } from './smartAccount.service';
import { getCryptoWalletForUser } from './wallet.service';
import { PimlicoBundlerService } from './bundler.service';
import { PimlicoPaymasterService } from './paymaster.service';
import { PrivyWalletProvider } from './embeddedWallet.provider';
import { AppError } from '../middleware/error.middleware';
import { ethers, Interface } from 'ethers';
import supabase from '../config/supabaseClient';
import { verifyPaymentReceiptInBackground } from './verification.service';
import { verifyAndRecordBasePayment } from './cryptoPayment.service';
import * as TransactionModel from '../models/transaction.model';
import * as SubscriptionModel from '../models/subscription.model';
import { getEffectiveCommissionRate } from '../utils/commission.utils';
import { incrementContentTipStats, incrementContentPpvEarningsStats } from './content.service';
import { calculateReferralFee, getReferrerWalletForCreator, recordReferralFee } from './referral.service';

import {
    getContractConfig,
    getRpcUrl,
    encodePaySubscription,
    encodePayTip,
    encodePayPPV,
    encodeApprove
} from '../utils/contract.utils';

// EntryPoint v0.7 ABI used to compute getUserOpHash on-chain (avoid replicating packing in JS).
// Full PackedUserOperation struct includes signature (9 fields).
const ENTRYPOINT_ABI = [
    'function getUserOpHash((address sender,uint256 nonce,bytes initCode,bytes callData,bytes32 accountGasLimits,uint256 preVerificationGas,bytes32 gasFees,bytes paymasterAndData,bytes signature)) view returns (bytes32)'
];

// SimpleAccount v0.7 exposes execute and executeBatch(address[],uint256[],bytes[]) for batched calls.
const SIMPLE_ACCOUNT_ABI = [
    'function execute(address dest, uint256 value, bytes func)',
    'function executeBatch(address[] dest, uint256[] values, bytes[] func)'
];

const MAX_UINT_128 = (1n << 128n) - 1n;

/**
 * 65-byte dummy ECDSA signature for paymaster simulation phase.
 * Uses r=1, s=n/2, v=27 — this is a structurally valid ECDSA signature
 * that passes all range checks (r>0, s<=n/2, v=27/28). ecrecover will
 * return a deterministic address that won't match the owner, but no
 * ECDSA library will revert on this (as opposed to an empty sig).
 */
const DUMMY_SIGNATURE = '0x00000000000000000000000000000000000000000000000000000000000000017fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a01b';

/**
 * Pack u128 high + u128 low into a 32-byte hex string (used for accountGasLimits and gasFees v0.7 fields).
 */
function packUints(high: bigint, low: bigint): string {
    if (high > MAX_UINT_128 || low > MAX_UINT_128) {
        throw new AppError('Gas limit / fee value exceeds 128 bits', 500);
    }
    const paddedHigh = high.toString(16).padStart(32, '0');
    const paddedLow = low.toString(16).padStart(32, '0');
    return '0x' + paddedHigh + paddedLow;
}

function unpackUints(hex32: string): { high: bigint; low: bigint } {
    const hex = hex32.startsWith('0x') ? hex32.slice(2) : hex32;
    const padded = hex.padStart(64, '0');
    return {
        high: BigInt('0x' + padded.slice(0, 32)),
        low: BigInt('0x' + padded.slice(32, 64)),
    };
}

/**
 * Convert internal UserOp (with initCode) to bundler format (factory/factoryData).
 * Pimlico v0.7 API rejects initCode and expects factory/factoryData when initializing,
 * or neither field when the account is already deployed.
 */
export function convertToBundlerFormat(userOp: any) {
    const op = { ...userOp };
    if (!op.initCode || op.initCode === '0x') {
        delete op.initCode;
        if (!op.factory || op.factory === '0x') delete op.factory;
        if (!op.factoryData || op.factoryData === '0x') delete op.factoryData;
        return op;
    }
    const factory = '0x' + op.initCode.slice(2, 42);
    const factoryData = '0x' + op.initCode.slice(42);
    delete op.initCode;
    return { ...op, factory, factoryData };
}

/**
 * Compute the EIP-4337 EntryPoint v0.7 UserOpHash by calling EntryPoint.getUserOpHash on-chain.
 * This is the canonical hash that Privy must sign over (after EIP-712 wrapping by EntryPoint).
 */
async function computeUserOpHash(
    op: UserOperation,
    entryPointAddress: string
): Promise<string> {
    const entrypointInterface = new Interface(ENTRYPOINT_ABI);

    // Pack accountGasLimits: verificationGasLimit (high128) | callGasLimit (low128)
    const vgl = BigInt(op.verificationGasLimit);
    const cgl = BigInt(op.callGasLimit);
    // Pack gasFees: maxPriorityFeePerGas (high128) | maxFeePerGas (low128)
    const mpfpg = BigInt(op.maxPriorityFeePerGas);
    const mfpg = BigInt(op.maxFeePerGas);

    // Build paymasterAndData field for v0.7: paymaster (20) + pmVGL (16) + pmPGL (16) + pmData (rest)
    // If no paymaster, this is "0x".
    let paymasterAndData = '0x';
    if (op.paymaster && op.paymaster !== '0x') {
        const pm = op.paymaster.slice(2).toLowerCase();
        const pmVGL = BigInt(op.paymasterVerificationGasLimit || '0x0').toString(16).padStart(32, '0');
        const pmPGL = BigInt(op.paymasterPostOpGasLimit || '0x0').toString(16).padStart(32, '0');
        const pmData = (op.paymasterData || '0x').slice(2);
        paymasterAndData = '0x' + pm + pmVGL + pmPGL + pmData;
    }

    const encoded = entrypointInterface.encodeFunctionData('getUserOpHash', [{
        sender: op.sender,
        nonce: op.nonce,
        initCode: op.initCode || '0x',
        callData: op.callData,
        accountGasLimits: packUints(vgl, cgl),
        preVerificationGas: BigInt(op.preVerificationGas),
        gasFees: packUints(mpfpg, mfpg),
        paymasterAndData,
        signature: op.signature || '0x'
    }]);

    // Use a public Base RPC to call the EntryPoint (don't route through the bundler)
    const rpcUrl = getRpcUrl();

    const { default: axios } = await import('axios');
    const response = await axios.post(rpcUrl, {
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: entryPointAddress, data: encoded }, 'latest'],
        id: 1
    });

    if (response.data.error) {
        throw new AppError(`getUserOpHash RPC failed: ${response.data.error.message}`, 502);
    }
    return response.data.result;
}

/**
 * Poll the bundler for a UserOperation receipt up to a timeout.
 */
async function waitForUserOperationReceipt(
    bundler: PimlicoBundlerService,
    userOpHash: string,
    opts: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<{ success: boolean; transactionHash: string; blockNumber: number }> {
    const intervalMs = opts.intervalMs ?? 2000;
    const timeoutMs = opts.timeoutMs ?? 60000;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const receipt = await bundler.getUserOperationReceipt(userOpHash);
        if (receipt) return receipt;
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new AppError('UserOperation receipt not found within timeout', 504);
}

export const processPaymentIntent = async (userId: string, intent: PaymentIntent): Promise<PaymentIntentResult> => {
    try {
        const walletProvider = new PrivyWalletProvider();
        const bundler = new PimlicoBundlerService();
        const paymaster = new PimlicoPaymasterService();

        const { contractAddress, usdcAddress, rpcUrl } = getContractConfig();

        if (!contractAddress) {
            throw new AppError('Contract address not configured', 500);
        }

        // Verify contract bytecode exists on chain before attempting simulation
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const code = await provider.getCode(contractAddress);
        if (!code || code === '0x' || code === '0x0') {
            throw new AppError(`Contract address ${contractAddress} is not deployed or has no bytecode on RPC network. Please check contract env configuration.`, 500);
        }

        const wallet = await walletProvider.getWallet(userId);
        if (!wallet) {
            throw new AppError('User does not have an embedded wallet', 400);
        }

        const smartAccount = await getOrCreateSmartAccount(userId, wallet.address);
        const creatorWallet = await getCryptoWalletForUser(intent.creatorId);
        const referrerWallet = (await getReferrerWalletForCreator(intent.creatorId)) || '0x0000000000000000000000000000000000000000';

        const { data: creatorProfile } = await supabase
            .from('profiles')
            .select('commission_rate, is_enclave_member')
            .eq('id', intent.creatorId)
            .single();
        const commissionRate = getEffectiveCommissionRate(creatorProfile);
        const platformFeeBps = Math.round(commissionRate * 100);

        const amountInUnits = ethers.parseUnits((intent.amountInCents / 100).toString(), 6); // USDC has 6 decimals

        const approveData = encodeApprove(contractAddress, amountInUnits);

        let paymentData: string;
        if (intent.type === 'Subscription') {
            const tierId = intent.relatedId ? ethers.encodeBytes32String(intent.relatedId.substring(0, 31)) : ethers.encodeBytes32String("default");
            paymentData = encodePaySubscription(usdcAddress, creatorWallet, amountInUnits, tierId, referrerWallet, platformFeeBps);
        } else if (intent.type === 'Tip') {
            paymentData = encodePayTip(usdcAddress, creatorWallet, amountInUnits, referrerWallet, platformFeeBps);
        } else if (intent.type === 'PPV Post' || intent.type === 'PPV Message') {
            const contentId = intent.relatedId ? ethers.encodeBytes32String(intent.relatedId.substring(0, 31)) : ethers.encodeBytes32String("content");
            paymentData = encodePayPPV(usdcAddress, creatorWallet, amountInUnits, contentId, referrerWallet, platformFeeBps);
        } else {
            throw new AppError('Invalid payment intent type', 400);
        }

        // SimpleAccount v0.7 executeBatch(address[] dest, uint256[] values, bytes[] func)
        const simpleAccountInterface = new Interface(SIMPLE_ACCOUNT_ABI);
        const callData = simpleAccountInterface.encodeFunctionData("executeBatch", [
            [usdcAddress, contractAddress],
            [0n, 0n],
            [approveData, paymentData]
        ]);

        const entryPoint = bundler.getEntryPointAddress();

        // Fetch the real nonce from the EntryPoint
        const nonce = await bundler.getSenderNonce(smartAccount.address, entryPoint, 0);

        // Fetch real gas price from the bundler
        const { maxFeePerGas, maxPriorityFeePerGas } = await bundler.getUserOperationGasPrice();

        // Build UserOperation (v0.7 expanded format — Pimlico requires initCode, not factory/factoryData)
        const initCode = smartAccount.isDeployed ? '0x' : smartAccount.initCode;
        console.log('[UserOpService] SmartAccount: deployed=%s, address=%s, initCode.length=%d, initCode.prefix=%s',
            smartAccount.isDeployed, smartAccount.address, initCode.length, initCode.substring(0, 10));
        let op: Partial<UserOperation> = {
            sender: smartAccount.address,
            nonce,
            initCode,
            callData,
            maxFeePerGas,
            maxPriorityFeePerGas,
            signature: DUMMY_SIGNATURE,
        };

        // Sponsorship must happen before gas estimation: Pimlico's pm_sponsorUserOperation
        // returns both paymaster data AND gas estimates in a single call, and the bundler
        // simulation requires paymaster fields to avoid reverting on 0 ETH balance.
        const isEligible = await paymaster.isEligibleForSponsorship(intent.amountInCents, userId);
        let sponsoredGas = false;
        if (isEligible) {
            const sponsorData = await paymaster.sponsorUserOperation(convertToBundlerFormat(op), entryPoint);
            op = { ...op, ...sponsorData };
            sponsoredGas = true;
        } else {
            // Non-sponsored: estimate gas via bundler (smart account must have ETH for gas)
            const gasEstimates = await bundler.estimateUserOperationGas(convertToBundlerFormat(op), entryPoint);
            op = { ...op, ...gasEstimates };
        }

        // Compute the real EIP-4337 UserOp hash via the EntryPoint, then have Privy sign it.
        const userOpHash = await computeUserOpHash(op as UserOperation, entryPoint);
        const ethSignedHash = ethers.hashMessage(ethers.getBytes(userOpHash));
        const signature = await walletProvider.signUserOperation(userId, ethSignedHash);

        op.signature = signature;

        // Submit
        const finalOpHash = await bundler.sendUserOperation(convertToBundlerFormat(op) as UserOperation, entryPoint);

        // Log event
        await supabase.from('wallet_events').insert({
            user_id: userId,
            event: 'PaymentInitiated',
            smart_account_address: smartAccount.address,
            user_operation_hash: finalOpHash,
            metadata: { intent, sponsoredGas }
        });

        // Poll for UserOperation receipt (op included in a mined bundle).
        // This typically completes in seconds on Pimlico. If the receipt
        // isn't found within the window, return pending — the client can
        // check status later via the transaction or userOpHash.
        let userOpReceipt: Awaited<ReturnType<typeof waitForUserOperationReceipt>> | null = null;
        try {
            userOpReceipt = await waitForUserOperationReceipt(bundler, finalOpHash);
        } catch {
            // Timeout — receipt not yet available
        }
        if (!userOpReceipt || !userOpReceipt.transactionHash) {
            return {
                success: true,
                userOpHash: finalOpHash,
                status: 'Pending',
                error: 'UserOperation submitted but not yet included in a bundle.'
            };
        }

        const txHash = userOpReceipt.transactionHash;

        // Remediation H-02: Require userOpReceipt.success === true before clearing
        if (userOpReceipt.success === false) {
            const isContentTransaction = intent.type === 'PPV Post' || intent.type === 'PPV Message' || intent.type === 'Tip';
            const relatedContentId = isContentTransaction ? (intent.relatedId || undefined) : undefined;
            await TransactionModel.createTransaction({
                fan_id: userId,
                creator_id: intent.creatorId,
                type: intent.type,
                amount: intent.amountInCents,
                platform_fee: 0,
                creator_payout: 0,
                status: 'Failed',
                blockchain_tx_hash: txHash,
                user_operation_hash: finalOpHash,
                related_content_id: relatedContentId,
            });
            return {
                success: false,
                userOpHash: finalOpHash,
                txHash,
                status: 'Failed',
                error: 'UserOperation reverted on-chain during execution.'
            };
        }

        // Verify receipt on-chain and record Cleared transaction with full event validation
        const verifiedResult = await verifyAndRecordBasePayment({
            txHash,
            fanId: userId,
            creatorId: intent.creatorId,
            amountInCents: intent.amountInCents,
            transactionType: intent.type,
            relatedId: intent.relatedId,
        });

        // Record user_operation_hash on the transaction
        await supabase
            .from('transactions')
            .update({ user_operation_hash: finalOpHash })
            .eq('id', verifiedResult.transactionId);

        // Create or update subscription record for Subscription-type payments
        if (intent.type === 'Subscription') {
            try {
                const existingSub = await SubscriptionModel.findSubscriptionByFanAndCreator(userId, intent.creatorId);
                const subPayload: any = {
                    fan_id: userId,
                    creator_id: intent.creatorId,
                    tier_id: intent.relatedId || 'default',
                    price: intent.amountInCents,
                    billing_cycle: 'monthly',
                    status: 'active',
                    start_date: new Date().toISOString(),
                    next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    blockchain_tx_hash: txHash,
                    fan_wallet_address: smartAccount.address,
                };

                if (existingSub) {
                    await SubscriptionModel.updateSubscription(String(existingSub.id), subPayload);
                } else {
                    await SubscriptionModel.createSubscription(subPayload);
                }
            } catch (err) {
                console.error('[UserOpService] Error creating subscription record:', err);
            }
        }

        verifyPaymentReceiptInBackground(
            verifiedResult.transactionId,
            txHash,
            intent.creatorId,
            intent.amountInCents,
            intent.type
        );

        await supabase.from('wallet_events').insert({
            user_id: userId,
            event: 'PaymentConfirmed',
            smart_account_address: smartAccount.address,
            user_operation_hash: finalOpHash,
            transaction_hash: txHash,
            metadata: { intent, sponsoredGas }
        });

        return {
            success: true,
            transactionId: verifiedResult.transactionId,
            userOpHash: finalOpHash,
            txHash,
            status: 'Cleared'
        };
    } catch (error: any) {
        if (error instanceof AppError) throw error;
        throw new AppError(`Failed to process payment intent: ${error.message}`, 500);
    }
};
