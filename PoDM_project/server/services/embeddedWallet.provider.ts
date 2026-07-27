import { IWalletProvider } from '../../common/types/EmbeddedWallet';
import { AppError } from '../middleware/error.middleware';
import axios from 'axios';
import supabase from '../config/supabaseClient';
import { Transaction, Signature } from 'ethers';

/**
 * PrivyWalletProvider — server-controlled embedded wallet EOA signer.
 *
 * Uses Privy's current REST API (https://docs.privy.io):
 *   - POST   /v1/wallets                       → create an embedded EOA wallet (chain_type=ethereum)
 *   - GET    /v1/wallets/{wallet_id}            → fetch a wallet by id
 *   - POST   /v1/wallets/{wallet_id}/rpc        → execute an RPC method on the wallet
 *       method: secp256k1_sign  → sign a raw 32-byte hash (used to sign ERC-4337 UserOp hashes)
 *
 * The wallet ID returned at creation is persisted on the profile (crypto_wallet_provider_id)
 * so subsequent signing requests can target the wallet directly.
 *
 * Basic Auth header = base64(`${appId}:${appSecret}`). `privy-app-id` header is also required.
 */
export class PrivyWalletProvider implements IWalletProvider {
    private readonly appId: string;
    private readonly appSecret: string;
    private readonly baseUrl: string = 'https://api.privy.io/v1';

    constructor() {
        this.appId = process.env.PRIVY_APP_ID || '';
        this.appSecret = process.env.PRIVY_APP_SECRET || '';
    }

    private getHeaders() {
        return {
            'privy-app-id': this.appId,
            // Basic Auth: username = appId, password = appSecret (per Privy OpenAPI securitySchemes.appSecretAuth)
            Authorization: `Basic ${Buffer.from(`${this.appId}:${this.appSecret}`).toString('base64')}`,
            'Content-Type': 'application/json'
        };
    }

    private assertConfigured() {
        if (!this.appId || !this.appSecret) {
            throw new AppError('Privy not configured. Set PRIVY_APP_ID and PRIVY_APP_SECRET in server/.env', 500);
        }
    }

    /**
     * Create a server-controlled embedded EOA wallet on Ethereum, tagged with our userId
     * via `external_id`. Returns the EOA address + the Privy wallet id (to persist).
     */
    async createWallet(userId: string): Promise<{ address: string; providerWalletId: string }> {
        this.assertConfigured();
        try {
            const response = await axios.post(
                `${this.baseUrl}/wallets`,
                {
                    chain_type: 'ethereum',
                    external_id: userId,
                    display_name: `PoDM-${userId.substring(0, 12)}`
                },
                { headers: this.getHeaders() }
            );
            const wallet = response.data;
            if (!wallet?.address || !wallet?.id) {
                throw new AppError('Privy wallet creation response missing address/id', 502);
            }
            return {
                address: wallet.address,
                providerWalletId: wallet.id
            };
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message;
            throw new AppError(`Failed to create Privy wallet: ${msg}`, error.response?.status || 500);
        }
    }

    /**
     * Fetch a wallet by its Privy wallet id (the one persisted at creation).
     * Returns null if not found or not owned by this Privy app.
     */
    async getWalletByProviderId(providerWalletId: string): Promise<{ address: string; providerWalletId: string } | null> {
        this.assertConfigured();
        try {
            const response = await axios.get(
                `${this.baseUrl}/wallets/${providerWalletId}`,
                { headers: this.getHeaders() }
            );
            const wallet = response.data;
            if (!wallet?.address || !wallet?.id) return null;
            return { address: wallet.address, providerWalletId: wallet.id };
        } catch (error: any) {
            if (error.response?.status === 404) return null;
            const msg = error.response?.data?.message || error.message;
            throw new AppError(`Failed to fetch Privy wallet: ${msg}`, error.response?.status || 500);
        }
    }

    async getWallet(userId: string): Promise<{ address: string; providerWalletId: string } | null> {
        // Backward-compat shim: the modern API is keyed by wallet id, not user id.
        // Look up the provider wallet id from the profiles table, then resolve via Privy.
        const { data: profile } = await supabase
            .from('profiles')
            .select('crypto_wallet_provider_id, crypto_wallet_address')
            .eq('id', userId)
            .maybeSingle();

        if (!profile?.crypto_wallet_provider_id) return null;
        return this.getWalletByProviderId(profile.crypto_wallet_provider_id);
    }

    /**
     * Sign a 32-byte EIP-4337 UserOperation hash with the embedded EOA's key.
     * Uses Privy's secp256k1_sign RPC (signs the raw hash directly — no EIP-191 prefixing).
     *
     * @param userId           App user id (used to resolve the provider wallet id)
     * @param userOpHash       0x-prefixed 32-byte hex hash returned by EntryPoint.getUserOpHash()
     */
    async signUserOperation(userId: string, userOpHash: string): Promise<string> {
        this.assertConfigured();
        const wallet = await this.getWallet(userId);
        if (!wallet) {
            throw new AppError('No Privy embedded wallet found for this user', 404);
        }

        try {
            const response = await axios.post(
                `${this.baseUrl}/wallets/${wallet.providerWalletId}/rpc`,
                {
                    chain_type: 'ethereum',
                    method: 'secp256k1_sign',
                    params: { hash: userOpHash }
                },
                { headers: this.getHeaders() }
            );
            const signature = response.data?.data?.signature ?? response.data?.signature;
            if (!signature) {
                throw new AppError('Privy sign response missing signature', 502);
            }
            return signature;
        } catch (error: any) {
            const detail = error.response?.data ? JSON.stringify(error.response.data) : 'no response body';
            console.error('Privy signUserOperation error:', error.response?.status, detail);
            const msg = error.response?.data?.message || error.response?.data?.error || error.message;
            throw new AppError(`Failed to sign UserOperation via Privy: ${msg}`, error.response?.status || 500);
        }
    }

    async healthCheck(): Promise<boolean> {
        this.assertConfigured();
        try {
            await axios.get(`${this.baseUrl}/wallets?limit=1`, { headers: this.getHeaders() });
            return true;
        } catch (error: any) {
            if (error.response?.status === 401 || error.response?.status === 403) return false;
            return false;
        }
    }

    private getRpcUrl(): string {
        return process.env.NODE_ENV === 'production'
            ? (process.env.BASE_RPC_URL || 'https://mainnet.base.org')
            : (process.env.BASE_TESTNET_RPC_URL || 'https://sepolia.base.org');
    }

    async sendTransaction(userId: string, tx: { to: string; data: string; value?: string }): Promise<string> {
        this.assertConfigured();
        const wallet = await this.getWallet(userId);
        if (!wallet) {
            throw new AppError('No Privy embedded wallet found for this user', 404);
        }

        try {
            const chainId = 84532;
            const rpcUrl = this.getRpcUrl();

            const [nonceRes, gasPriceRes, estimateRes] = await Promise.all([
                axios.post(rpcUrl, { jsonrpc: '2.0', method: 'eth_getTransactionCount', params: [wallet.address, 'latest'], id: 1 }),
                axios.post(rpcUrl, { jsonrpc: '2.0', method: 'eth_gasPrice', params: [], id: 1 }),
                axios.post(rpcUrl, { jsonrpc: '2.0', method: 'eth_estimateGas', params: [{ from: wallet.address, to: tx.to, data: tx.data, value: tx.value || '0x0' }], id: 1 }),
            ]);

            const nonce = parseInt(nonceRes.data.result, 16);
            const gasPrice = BigInt(gasPriceRes.data.result);
            const gasLimit = BigInt(estimateRes.data.result);

            const ethersTx = new Transaction();
            ethersTx.to = tx.to;
            ethersTx.data = tx.data;
            ethersTx.value = tx.value ? BigInt(tx.value) : 0n;
            ethersTx.nonce = nonce;
            ethersTx.gasLimit = gasLimit;
            ethersTx.gasPrice = gasPrice;
            ethersTx.chainId = chainId;
            ethersTx.type = 0;

            const hashToSign = ethersTx.unsignedHash;

            const signResponse = await axios.post(
                `${this.baseUrl}/wallets/${wallet.providerWalletId}/rpc`,
                {
                    chain_type: 'ethereum',
                    method: 'secp256k1_sign',
                    params: { hash: hashToSign }
                },
                { headers: this.getHeaders() }
            );
            const signatureHex = signResponse.data?.data?.signature ?? signResponse.data?.signature;
            if (!signatureHex) {
                throw new AppError('Privy sign response missing signature', 502);
            }

            ethersTx.signature = Signature.from(signatureHex);
            const signedSerialized = ethersTx.serialized;

            const broadcastRes = await axios.post(rpcUrl, {
                jsonrpc: '2.0',
                method: 'eth_sendRawTransaction',
                params: [signedSerialized],
                id: 1
            });

            const txHash = broadcastRes.data.result;
            if (!txHash) {
                throw new AppError('RPC broadcast returned no transaction hash', 502);
            }
            return txHash;
        } catch (error: any) {
            const detail = error.response?.data ? JSON.stringify(error.response.data) : 'no response body';
            console.error('Privy sendTransaction error:', error.response?.status, detail);
            const msg = error.response?.data?.message || error.response?.data?.error || error.message;
            throw new AppError(`Failed to send transaction via Privy: ${msg}`, error.response?.status || 500);
        }
    }
}
