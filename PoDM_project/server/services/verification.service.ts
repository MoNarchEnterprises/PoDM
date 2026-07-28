import supabase from '../config/supabaseClient';
import { DEFAULT_COMMISSION_RATE } from '../../lib/constants';
import { keccak256, toUtf8Bytes } from 'ethers';
import axios from 'axios';
import { getCryptoWalletForUser } from './wallet.service';
import { calculateReferralFee } from './referral.service';

const EVENT_TOPICS = {
    SubscriptionPaid: computeEventTopic('SubscriptionPaid(address,address,address,uint256,bytes32,uint256,uint256)'),
    TipPaid: computeEventTopic('TipPaid(address,address,address,uint256,uint256,uint256)'),
    PPVPaid: computeEventTopic('PPVPaid(address,address,address,uint256,bytes32,uint256,uint256)'),
};

function computeEventTopic(eventSignature: string): string {
    return keccak256(toUtf8Bytes(eventSignature));
}

function getRpcConfig(): { rpcUrl: string; contractAddress: string; chainId: number } {
    const isProd = process.env.NODE_ENV === 'production';
    const rpcUrl = isProd
        ? (process.env.BASE_RPC_URL || 'https://mainnet.base.org')
        : (process.env.BASE_TESTNET_RPC_URL || 'https://sepolia.base.org');
    const contractAddress = (isProd ? process.env.BASE_CONTRACT_ADDRESS : process.env.BASE_TESTNET_CONTRACT_ADDRESS) || '';
    const chainId = isProd ? 8453 : 84532;
    return { rpcUrl, contractAddress, chainId };
}

async function getCommissionRate(creatorId: string): Promise<number> {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('commission_rate')
        .eq('id', creatorId)
        .single();

    if (error) {
        console.error('[VerificationService] Failed to fetch commission_rate:', error.message);
        return DEFAULT_COMMISSION_RATE;
    }

    return profile?.commission_rate ?? DEFAULT_COMMISSION_RATE;
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

    const { error: updateError } = await supabase
        .from('transactions')
        .update({
            status: 'Cleared',
            platform_fee: adjustedPlatformFee,
            creator_payout: creatorPayout,
            referral_fee: referralFee,
            referrer_id: referrerId || null,
            payment_method: 'crypto',
            payment_currency: 'USDC',
            chain_id: chainId,
            verified_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

    if (updateError) {
        console.error('[VerificationService] Failed to update transaction metadata:', updateError.message);
    } else {
        console.log('[VerificationService] Verified on-chain receipt for tx', txHash);
    }
};

async function getCreatorWalletFromProfile(creatorId: string): Promise<string> {
    const { data: profile } = await supabase
        .from('profiles')
        .select('crypto_wallet_address')
        .eq('id', creatorId)
        .single();

    return profile?.crypto_wallet_address || '';
}
