import axios from 'axios';
import supabase from '../config/supabaseClient';
import { AppError } from '../middleware/error.middleware';
import { getChainId } from '../utils/contract.utils';

import crypto from 'crypto';

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

function generateCoinbaseJwt(keyId: string, secret: string, method: string, path: string): string {
    const host = 'api.coinbase.com';
    const uri = `${method} ${host}${path}`;

    let key: crypto.KeyObject;
    if (secret.includes('-----BEGIN')) {
        key = crypto.createPrivateKey(secret);
    } else {
        const buf = Buffer.from(secret, 'base64');
        let pkcs8: Buffer;
        if (buf.length === 32) {
            const pkcs8Header = Buffer.from('302e020100300506032b657004220420', 'hex');
            pkcs8 = Buffer.concat([pkcs8Header, buf]);
        } else if (buf.length === 64) {
            const pkcs8Header = Buffer.from('302e020100300506032b657004220420', 'hex');
            pkcs8 = Buffer.concat([pkcs8Header, buf.subarray(0, 32)]);
        } else {
            pkcs8 = buf;
        }
        key = crypto.createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' });
    }

    const header = {
        alg: 'EdDSA',
        kid: keyId,
        nonce: crypto.randomBytes(16).toString('hex')
    };

    const iat = Math.floor(Date.now() / 1000);
    const payload = {
        iss: 'cdp',
        sub: keyId,
        nbf: iat,
        iat,
        exp: iat + 120,
        uri
    };

    const base64url = (b: Buffer) => b.toString('base64url');
    const headerStr = base64url(Buffer.from(JSON.stringify(header)));
    const payloadStr = base64url(Buffer.from(JSON.stringify(payload)));
    const data = `${headerStr}.${payloadStr}`;
    const signature = crypto.sign(null, Buffer.from(data), key);
    return `${data}.${base64url(signature)}`;
}

function getConfig(): { apiKey: string; webhookSecret: string; appId: string } {
    const apiKey = process.env.COINBASE_ONRAMP_API_KEY;
    const webhookSecret = process.env.COINBASE_ONRAMP_WEBHOOK_SECRET;
    const appId = process.env.COINBASE_ONRAMP_APP_ID;

    if (!apiKey && (!process.env.COINBASE_ONRAMP_API_KEY_ID || !process.env.COINBASE_ONRAMP_API_KEY_SECRET)) {
        throw new AppError(
            'Coinbase On-Ramp not configured. Set COINBASE_ONRAMP_API_KEY (or COINBASE_ONRAMP_API_KEY_ID and COINBASE_ONRAMP_API_KEY_SECRET), COINBASE_ONRAMP_WEBHOOK_SECRET, and COINBASE_ONRAMP_APP_ID.',
            500
        );
    }

    if (!webhookSecret || !appId) {
        throw new AppError(
            'Coinbase On-Ramp not configured. Set COINBASE_ONRAMP_WEBHOOK_SECRET and COINBASE_ONRAMP_APP_ID.',
            500
        );
    }

    return { apiKey: apiKey || '', webhookSecret, appId };
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

        let token = apiKey;
        if (!token && process.env.COINBASE_ONRAMP_API_KEY_ID && process.env.COINBASE_ONRAMP_API_KEY_SECRET) {
            token = generateCoinbaseJwt(
                process.env.COINBASE_ONRAMP_API_KEY_ID,
                process.env.COINBASE_ONRAMP_API_KEY_SECRET,
                'POST',
                '/api/v1/onramp/sessions'
            );
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
                    Authorization: `Bearer ${token}`,
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
                blockchain_tx_hash: session.id,
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
            .eq('blockchain_tx_hash', sessionId)
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
                chain_id: getChainId(),
            })
            .eq('id', pendingTx.id);

        if (updateError) {
            console.error('[OnRampService] Failed to update onramp transaction:', updateError.message);
        }

        console.log('[OnRampService] On-Ramp completed:', sessionId, txHash);
    }
}

export const onRampService = new OnRampService();
