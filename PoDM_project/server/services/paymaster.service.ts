import { IPaymasterService, UserOperation } from '../../common/types/EmbeddedWallet';
import { AppError } from '../middleware/error.middleware';
import { ethers } from 'ethers';
import axios from 'axios';

import { getChainNamespace } from '../utils/contract.utils';

export class PimlicoPaymasterService implements IPaymasterService {
    private readonly apiKey: string;
    private readonly paymasterUrl: string;

    constructor() {
        this.apiKey = process.env.PIMLICO_API_KEY || '';
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

    async sponsorUserOperation(op: Partial<UserOperation>, entryPoint: string): Promise<{ paymaster: string; paymasterData: string; paymasterVerificationGasLimit: string; paymasterPostOpGasLimit: string; callGasLimit: string; verificationGasLimit: string; preVerificationGas: string; }> {
        // Pimlico Verifying Paymaster v0.7 expects factory/factoryData (not initCode)
        // and positional params: [userOp, entryPoint], with all paymaster fields set to null
        const paymasterOp: any = {
            sender: op.sender,
            nonce: op.nonce,
            callData: op.callData,
            callGasLimit: op.callGasLimit || '0x0',
            verificationGasLimit: op.verificationGasLimit || '0x0',
            preVerificationGas: op.preVerificationGas || '0x0',
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

        const result = await this.rpcCall('pm_sponsorUserOperation', [paymasterOp, entryPoint]);
        return result;
    }

    async isEligibleForSponsorship(amountInCents: number, userId: string): Promise<boolean> {
        // Sponsor all UserOperations — smart accounts have no ETH to pay prefund
        return true;
    }
}
