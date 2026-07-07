import axios from 'axios';
import supabase from '../config/supabaseClient';
import { AppError } from '../middleware/error.middleware';

interface OnRampSession {
    sessionId: string;
    hostUrl: string;
}

interface OnRampWebhookEvent {
    event: string;
    data: {
        sessionId: string;
        status: string;
        destination: string;
        transactionHash?: string;
        asset?: string;
        amount?: string;
        network?: string;
    };
}

function getConfig(): { apiKey: string; webhookSecret: string; appId: string } {
    const apiKey = process.env.COINBASE_ONRAMP_API_KEY;
    const webhookSecret = process.env.COINBASE_ONRAMP_WEBHOOK_SECRET;
    const appId = process.env.COINBASE_ONRAMP_APP_ID;

    if (!apiKey || !webhookSecret || !appId) {
        throw new AppError(
            'Coinbase On-Ramp not configured. Set COINBASE_ONRAMP_API_KEY, COINBASE_ONRAMP_WEBHOOK_SECRET, and COINBASE_ONRAMP_APP_ID.',
            500
        );
    }

    return { apiKey, webhookSecret, appId };
}

const ONRAMP_API_BASE = 'https://api.coinbase.com/api/v1';
const ONRAMP_HOST_BASE = 'https://pay.coinbase.com';

export class OnRampService {
    /**
     * Create a Coinbase On-Ramp session for buying USDC on Base.
     * Returns a hosted URL the user can visit (or embed via iframe).
     */
    async createCharge(amount: number, fanId: string, destinationWallet: string): Promise<OnRampSession> {
        const { apiKey, appId } = getConfig();

        if (!destinationWallet || !/^0x[a-fA-F0-9]{40}$/.test(destinationWallet)) {
            throw new AppError('A valid destination wallet address is required.', 400);
        }

        const response = await axios.post(
            `${ONRAMP_API_BASE}/onramp/sessions`,
            {
                app_id: appId,
                destination_wallets: [
                    {
                        address: destinationWallet,
                        blockchains: ['base'],
                        assets: ['USDC'],
                    },
                ],
                default_network: 'base',
                default_asset: 'USDC',
                fiat_currency: 'USD',
                preset_fiat_amount: amount,
                metadata: {
                    fanId,
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const session = response.data?.data;
        if (!session?.id) {
            throw new AppError('Failed to create Coinbase On-Ramp session.', 502);
        }

        const { error: insertError } = await supabase
            .from('transactions')
            .insert({
                fan_id: fanId,
                type: 'OnRamp',
                amount: Math.round(amount * 100),
                status: 'Pending',
                payment_gateway_id: session.id,
                payment_method: 'card_onramp',
                payment_currency: 'USD',
            });

        if (insertError) {
            console.error('[OnRampService] Failed to record pending onramp transaction:', insertError.message);
        }

        return {
            sessionId: session.id,
            hostUrl: `${ONRAMP_HOST_BASE}/buy/${session.id}`,
        };
    }

    /**
     * Handle a Coinbase On-Ramp webhook event.
     * Verifies the payload signature, then processes the completed purchase.
     */
    async handleWebhook(rawBody: string, signature: string | undefined): Promise<void> {
        const { webhookSecret } = getConfig();

        if (!signature) {
            throw new AppError('Missing Coinbase On-Ramp webhook signature.', 401);
        }

        const crypto = await import('crypto');
        const expectedSig = crypto
            .createHmac('sha256', webhookSecret)
            .update(rawBody)
            .digest('hex');

        if (signature !== expectedSig) {
            throw new AppError('Invalid Coinbase On-Ramp webhook signature.', 401);
        }

        const event: OnRampWebhookEvent = JSON.parse(rawBody);

        if (event.event !== 'charge_completed' || event.data.status !== 'COMPLETED') {
            console.log('[OnRampService] Ignoring non-completion event:', event.event, event.data.status);
            return;
        }

        const sessionId = event.data.sessionId;
        const txHash = event.data.transactionHash;
        const asset = event.data.asset;

        if (asset !== 'USDC') {
            console.log('[OnRampService] Ignoring non-USDC purchase:', asset);
            return;
        }

        const { data: pendingTx, error: lookupError } = await supabase
            .from('transactions')
            .select('*')
            .eq('payment_gateway_id', sessionId)
            .single();

        if (lookupError || !pendingTx) {
            console.error('[OnRampService] No pending transaction found for session:', sessionId);
            return;
        }

        const { error: updateError } = await supabase
            .from('transactions')
            .update({
                status: 'Cleared',
                blockchain_tx_hash: txHash || null,
                payment_currency: 'USDC',
                chain_id: 84532,
            })
            .eq('id', pendingTx.id);

        if (updateError) {
            console.error('[OnRampService] Failed to update onramp transaction:', updateError.message);
        }

        console.log('[OnRampService] On-Ramp completed:', sessionId, txHash);
    }
}

export const onRampService = new OnRampService();
