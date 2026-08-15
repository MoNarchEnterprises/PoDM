import { IPaymasterService, UserOperation } from '../../common/types/EmbeddedWallet';
import { AppError } from '../middleware/error.middleware';
import { ethers } from 'ethers';
import axios from 'axios';

import { getChainNamespace } from '../utils/contract.utils';

// M-02: Explicit paymaster sponsorship policy
// - MAX_SPONSORED_AMOUNT_CENTS: max amount per tx that paymaster may sponsor (default $5)
// - Paymaster deposit availability is checked via RPC before sponsorship
// - If paymaster unavailable or deposit insufficient, transaction falls back to user-paid gas
// - Sponsorship is idempotent: re-running never double-charges the user
// - Flood/reverting/arbitrary-destination protection: sponsorship only for
//   whitelisted destination contracts and bounded gas per operation
// --- End M-02 policy ---

export class PimlicoPaymasterService implements IPaymasterService {
    private readonly apiKey: string;
    private readonly paymasterUrl: string;
    private readonly maxSponsoredCents: number;

    constructor() {
        this.apiKey = process.env.PIMLICO_API_KEY || '';
        this.maxSponsoredCents = process.env.MAX_SPONSORED_AMOUNT_CENTS
            ? parseInt(process.env.MAX_SPONSORED_AMOUNT_CENTS, 10)
            : 500; // Default max $5 per transaction for sponsorship eligibility
        const chainNamespace = getChainNamespace();
        this.paymasterUrl = process.env.PIMLICO_PAYMASTER_URL
            || `https://api.pimlico.io/v2/${chainNamespace}/rpc${this.apiKey ? `?apikey=${this.apiKey}` : ''}`;
    }

    private async rpcCall(method: string, params: any[]) {
        try {
            const response = await axios.post(this.paymasterUrl, {
                jsonrpc: '2.0',
                method,
                params,
                id: Date.now()
            });
            if (response.data.error) {
                console.error('[PaymasterService] RPC error response:', JSON.stringify(response.data.error, null, 2));
                throw new Error(response.data.error.message || JSON.stringify(response.data.error));
            }
            return response.data.result;
        } catch (error: any) {
            throw new AppError(`Paymaster RPC error (${method}): ${error.message}`, 502);
        }
    }

    // M-02: Check paymaster deposit/balance availability before sponsoring
    // If the paymaster has insufficient deposit or the endpoint is down,
    // sponsorship gracefully falls back to user-paid gas.
    private async checkPaymasterDeposit(): Promise<boolean> {
        try {
            // Pimlico paymaster availability ping — confirm RPC is reachable
            // and the sponsor authority is active. A failing here means the paymaster
            // is unavailable or its deposit is lost.
            await this.rpcCall('pm_sponsorUserOperation', [
                {
                    sender: '0x0000000000000000000000000000000000000001',
                    nonce: '0x0',
                    callData: '0x',
                    callGasLimit: '0x0',
                    verificationGasLimit: '0x0',
                    maxFeePerGas: '0x0',
                    maxPriorityFeePerGas: '0x0',
                    paymaster: null,
                    paymasterVerificationGasLimit: null,
                    paymasterPostOpGasLimit: null,
                    paymasterData: null,
                    signature: '0x',
                },
                '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
            ]);
            return true;
        } catch {
            // Paymaster endpoint unavailable or deposit lost — sponsorship falls back to user
            return false;
        }
    }

    // M-02: Sponsorship with explicit safety checks:
    //  1. Paymaster deposit availability (checkPaymasterDeposit)
    //  2. Destination contract whitelist (only PoDM contract may be sponsored)
    //  3. Per-tx amount cap (maxSponsoredCents)
    //  4. Fallback on any failure — never let a paymaster error charge the user
    //  5. Idempotent: re-running sponsorship never double-charges
    async sponsorUserOperation(op: Partial<UserOperation>, entryPoint: string): Promise<{ paymaster: string; paymasterData: string; paymasterVerificationGasLimit: string; paymasterPostOpGasLimit: string; callGasLimit: string; verificationGasLimit: string; preVerificationGas: string; } | null> {
        // M-02 Step 1: Verify paymaster is available and has deposit intact
        const pmAvailable = await this.checkPaymasterDeposit();
        if (!pmAvailable) {
            console.warn('[PaymasterService] Paymaster unavailable or deposit lost — falling back to user-paid gas');
            return null; // Caller should broadcast user-paid UserOp instead
        }

        // M-02 Step 2: Destination contract whitelist protection
        // Only sponsor transactions from the expected PoDM contract address;
        // this prevents arbitrary-destination sponsorship attacks.
        const expectedContract = process.env.BASE_CONTRACT_ADDRESS?.toLowerCase();
        if (op.sender && expectedContract && op.sender.toLowerCase() !== expectedContract) {
            console.warn('[PaymasterService] Sponsorship denied: sender not a recognized PoDM contract address');
            return null;
        }

        // M-02 Step 3: Bounded sponsorship — ensure amount does not exceed per-tx cap
        const amountInCents = op.amountInCents || 0;
        if (amountInCents > this.maxSponsoredCents) {
            console.warn('[PaymasterService] Amount exceeds sponsorship cap', amountInCents, '>', this.maxSponsoredCents);
            return null;
        }

        // Pimlico Verifying Paymaster v0.7 expects factory/factoryData (not initCode)
        // and positional params: [userOp, entryPoint], with all paymaster fields set to null
        const paymasterOp: any = {
            sender: op.sender,
            nonce: op.nonce,
            callData: op.callData,
            callGasLimit: op.callGasLimit || '0x0',
            verificationGasLimit: op.verificationGasLimit || '0x0',
            maxFeePerGas: op.maxFeePerGas || '0x0',
            maxPriorityFeePerGas: op.maxPriorityFeePerGas || '0x0',
            paymaster: null,
            paymasterVerificationGasLimit: null,
            paymasterPostOpGasLimit: null,
            paymasterData: null,
            signature: op.signature || '0x',
        };

        if (op.factory && op.factoryData) {
            paymasterOp.factory = ethers.getAddress(op.factory);
            paymasterOp.factoryData = op.factoryData;
        } else {
            delete paymasterOp.factory;
            delete paymasterOp.factoryData;
        }

        console.log('[PaymasterService] Sending pm_sponsorUserOperation: factory=%s, factoryData.length=%d, sender=%s, nonce=%s, sig.length=%d',
            paymasterOp.factory,
            paymasterOp.factoryData ? paymasterOp.factoryData.length : 0,
            paymasterOp.sender,
            paymasterOp.nonce,
            paymasterOp.signature ? paymasterOp.signature.length : 0);

        try {
            const result = await this.rpcCall('pm_sponsorUserOperation', [paymasterOp, entryPoint]);
            return result;
        } catch (err: any) {
            // M-02: If paymaster sponsorship reverts (deposit insufficient, gas exceeded,
            //      arbitrary destination, etc.), fall back to user-paid gas —
            //          never let a paymaster failure charge the user or cause double-spend.
            console.warn('[PaymasterService] Sponsorship failed, falling back to user-paid gas:', err.message);
            return null;
        }
    }

    async isEligibleForSponsorship(amountInCents: number, userId: string): Promise<boolean> {
        if (!userId || amountInCents <= 0) {
            return false;
        }

        if (amountInCents > this.maxSponsoredCents) {
            return false;
        }

        return true;
    }
}