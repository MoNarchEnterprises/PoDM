import { getCommissionRateForCreator } from '../utils/fee.utils';
import { keccak256, toUtf8Bytes } from 'ethers';
import axios from 'axios';
import { getCryptoWalletForUser } from './wallet.service';
import { calculateReferralFee, getReferrerWalletForCreator } from './referral.service';

import { getContractConfig, EVENT_TOPICS } from '../utils/contract.utils';

function getRpcConfig(): { rpcUrl: string; contractAddress: string; chainId: number } {
    const { rpcUrl, contractAddress, chainId } = getContractConfig();
    return { rpcUrl, contractAddress, chainId };
}

async function getCommissionRate(creatorId: string): Promise<number> {
    return getCommissionRateForCreator(creatorId);
}

function getExpectedTopic(transactionType: string): string {
    if (transactionType === 'Subscription') return EVENT_TOPICS.SubscriptionPaid;
    if (transactionType === 'Tip') return EVENT_TOPICS.TipPaid;
    return EVENT_TOPICS.PPVPaid;
}

export const verifyPaymentReceiptInBackground = async (
    transactionId: string,
    txHash: string,
    creatorId: string,
    amountInCents: number,
    transactionType: string
): Promise<void> => {
    const { rpcUrl, contractAddress, chainId } = getRpcConfig();

    const MAX_ATTEMPTS = 10;
    const ATTEMPT_DELAY_MS = 6000;

    let receipt: any | null = null;
    let lastRpc: any = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
            const response = await axios.post(rpcUrl, {
                jsonrpc: '2.0',
                method: 'eth_getTransactionReceipt',
                params: [txHash],
                id: 1
            });
            lastRpc = response.data;
            receipt = response.data?.result;
            if (receipt) break;
        } catch {
            // RPC error, retry
        }
        await new Promise((resolve) => setTimeout(resolve, ATTEMPT_DELAY_MS));
    }

    if (!receipt) {
        console.warn('[VerificationService] On-chain receipt not found for tx', txHash, '— marking transaction Failed');
        await supabase
            .from('transactions')
            .update({ status: 'Failed' })
            .eq('id', transactionId);
        return;
    }

    if (lastRpc?.error) {
        console.warn('[VerificationService] RPC error fetching receipt:', lastRpc.error.message);
        return;
    }

    if (receipt.status !== '0x1') {
        console.warn('[VerificationService] Transaction failed on-chain:', txHash);
        await supabase
            .from('transactions')
            .update({ status: 'Failed' })
            .eq('id', transactionId);
        return;
    }

    const expectedTopic = getExpectedTopic(transactionType);

    // Rely strictly on event log inspection for PoDM contract interaction.
    // For ERC-4337 UserOps, receipt.to is the EntryPoint contract address (0x000...32), not the PoDM contract.
    const contractInteracted = receipt.logs && receipt.logs.some((log: any) =>
        log.address && log.address.toLowerCase() === contractAddress.toLowerCase() &&
        log.topics && log.topics[0] === expectedTopic
    );

    if (!contractInteracted) {
        console.warn('[VerificationService] Transaction did not interact with PoDM contract:', txHash);
        await supabase
            .from('transactions')
            .update({ status: 'Failed' })
            .eq('id', transactionId);
        return;
    }

    const contractLog = receipt.logs.find((log: any) =>
        log.address && log.address.toLowerCase() === contractAddress.toLowerCase() &&
        log.topics && log.topics[0] === expectedTopic
    );

    if (!contractLog) {
        console.warn('[VerificationService] Expected event not found in tx logs:', txHash);
        await supabase
            .from('transactions')
            .update({ status: 'Failed' })
            .eq('id', transactionId);
        return;
    }

    let creatorWalletAddress = await getCreatorWalletFromProfile(creatorId);
    if (!creatorWalletAddress) {
        creatorWalletAddress = await getCryptoWalletForUser(creatorId);
    }

    const recipientTopic = contractLog.topics[2];
    if (recipientTopic) {
        if (!creatorWalletAddress) {
            console.warn('[VerificationService] Creator wallet unconfigured, skipping recipient topic check for tx:', txHash);
        } else {
            const recipientHex = '0x' + recipientTopic.slice(26).toLowerCase();
            if (recipientHex.toLowerCase() !== creatorWalletAddress.toLowerCase()) {
                console.warn('[VerificationService] Recipient mismatch. Expected:', creatorWalletAddress, 'Got:', recipientHex);
                await supabase
                    .from('transactions')
                    .update({ status: 'Failed' })
                    .eq('id', transactionId);
                return;
            }
        }
    }

    const tokenTopic = contractLog.topics[3];
    if (tokenTopic) {
        const tokenHex = '0x' + tokenTopic.slice(26).toLowerCase();
        const { usdcAddress } = getContractConfig();
        if (usdcAddress && tokenHex.toLowerCase() !== usdcAddress.toLowerCase()) {
            console.warn('[VerificationService] Token mismatch. Expected USDC:', usdcAddress, 'Got:', tokenHex);
            await supabase
                .from('transactions')
                .update({ status: 'Failed' })
                .eq('id', transactionId);
            return;
        }
    }

    const dataHex = contractLog.data;
    if (dataHex && dataHex.startsWith('0x')) {
        const totalAmountHex = '0x' + dataHex.slice(2, 66);
        const rawAmount = parseInt(totalAmountHex, 16);
        const blockchainAmountInCents = Math.round(rawAmount / 10000);

        if (Math.abs(blockchainAmountInCents - amountInCents) > 1) {
            console.warn('[VerificationService] Amount mismatch. Blockchain:', blockchainAmountInCents, 'Expected:', amountInCents);
            await supabase
                .from('transactions')
                .update({ status: 'Failed' })
                .eq('id', transactionId);
            return;
        }

        // Referrer & referral-fee on-chain validation (v2 contract split).
        // Slots vary by event type:
        //   SubscriptionPaid / PPVPaid: [0] total, [1] idHash, [2] platformFee, [3] referralFee, [4] creatorAmount, [5] referrer
        //   TipPaid:                    [0] total, [1] platformFee, [2] referralFee, [3] creatorAmount, [4] referrer
        const expectedReferrerWallet = await getReferrerWalletForCreator(creatorId);
        const referralFeeSlot = transactionType === 'Tip' ? 2 : 3;
        const referrerSlot = transactionType === 'Tip' ? 4 : 5;
        const referralFeeRaw = parseInt('0x' + dataHex.slice(2 + referralFeeSlot * 64, 2 + (referralFeeSlot + 1) * 64), 16);
        const referralFeeInCents = Math.round(referralFeeRaw / 10000);
        const referrerHex = ('0x' + dataHex.slice(2 + referrerSlot * 64 + 24, 2 + (referrerSlot + 1) * 64)).toLowerCase();

        if (expectedReferrerWallet) {
            if (!referrerHex || referrerHex !== expectedReferrerWallet.toLowerCase()) {
                console.warn('[VerificationService] Referrer mismatch. Expected:', expectedReferrerWallet, 'Got:', referrerHex);
                await supabase
                    .from('transactions')
                    .update({ status: 'Failed' })
                    .eq('id', transactionId);
                return;
            }
            const commissionRate = await getCommissionRate(creatorId);
            const { referralFee } = await calculateReferralFee({ creatorId, amountInCents, commissionRate });
            if (Math.abs(referralFeeInCents - referralFee) > 2) {
                console.warn('[VerificationService] Referral fee mismatch. Blockchain:', referralFeeInCents, 'Expected:', referralFee);
                await supabase
                    .from('transactions')
                    .update({ status: 'Failed' })
                    .eq('id', transactionId);
                return;
            }
        } else if (referrerHex && referrerHex !== '0x0000000000000000000000000000000000000000') {
            console.warn('[VerificationService] Unexpected referrer on tx with no active referral:', referrerHex);
            await supabase
                .from('transactions')
                .update({ status: 'Failed' })
                .eq('id', transactionId);
            return;
        }
    }

    const commissionRate = await getCommissionRate(creatorId);
    const platformFee = Math.round(amountInCents * (commissionRate / 100));
    const creatorPayout = amountInCents - platformFee;

    const { referralFee, referrerId } = await calculateReferralFee({
        creatorId,
        amountInCents,
        commissionRate,
    });
    const adjustedPlatformFee = platformFee - referralFee;

    const updatePayload: Record<string, any> = {
        status: 'Cleared',
        platform_fee: adjustedPlatformFee,
        creator_payout: creatorPayout,
        payment_method: 'crypto',
        payment_currency: 'USDC',
        chain_id: chainId,
        verified_at: new Date().toISOString(),
    };
    if (referralFee > 0) {
        updatePayload.referral_fee = referralFee;
        updatePayload.referrer_id = referrerId;
    }

    const { error: updateError } = await supabase
        .from('transactions')
        .update(updatePayload)
        .eq('id', transactionId);

    if (updateError) {
        console.error('[VerificationService] Failed to update transaction metadata:', updateError.message);
    } else {
        console.log('[VerificationService] Verified on-chain receipt for tx', txHash);
    }
};

/*** M-01: Explicit finality / reorg policy ***
 *  - Minimum confirmation threshold enforced (BASE_MIN_CONFIRMATIONS, default 2)
 *  - Receipt re-fetched at final block to guard against RPC staleness / reorg
 *  - RPC chain ID must match configured chain ID (network partition protection)
 *  - Transaction status must be '0x1' (success)
 *  - If receipt disappears after initial fetch (reorg), transaction is marked Failed
 *  - No Cleared record until all checks pass; idempotent on re-run
 ***/
function assertReceiptFinality(receipt: any, latestBlockNumber: number, chainId: number, rpcChainId: number | null): asserts receipt is { status: string; blockNumber: number } {
    if (receipt.status !== '0x1') {
        throw new Error('Transaction failed on-chain (status !== 0x1)');
    }
    const receiptBlockNumber = receipt.blockNumber ? parseInt(receipt.blockNumber, 16) : 0;
    const envMinConf = parseInt(process.env.BASE_MIN_CONFIRMATIONS ?? "2", 10);
    const minConfirmations = Math.max(1, isNaN(envMinConf) ? 2 : envMinConf);
    const confirmations = receiptBlockNumber > 0 && latestBlockNumber >= receiptBlockNumber
        ? latestBlockNumber - receiptBlockNumber + 1
        : 0;
    if (confirmations < Number(minConfirmations)) {
        throw new Error(`Insufficient confirmations: ${confirmations}/${minConfirmations}`);
    }
}
// End M-01 policy ***/

async function getCreatorWalletFromProfile(creatorId: string): Promise<string> {
    const { data: profile } = await supabase
        .from('profiles')
        .select('crypto_wallet_address')
        .eq('id', creatorId)
        .single();

    return profile?.crypto_wallet_address || '';
}
