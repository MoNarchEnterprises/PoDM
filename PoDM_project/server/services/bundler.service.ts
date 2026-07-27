import { IBundlerService, UserOperation } from '../../common/types/EmbeddedWallet';
import { AppError } from '../middleware/error.middleware';
import { ethers } from 'ethers';
import axios from 'axios';

const DEFAULT_ENTRYPOINT = '0x0000000071727De22E5E9d8BAf0edAc6f37da032'; // EntryPoint v0.7

const ENTRYPOINT_ABI = [
    'function getNonce(address sender, uint192 key) view returns (uint256 nonce)'
];
const entrypointInterface = new ethers.Interface(ENTRYPOINT_ABI);

export class PimlicoBundlerService implements IBundlerService {
    private readonly apiKey: string;
    private readonly bundlerUrl: string;
    private readonly standardRpcUrl: string;

    /**
     * Convert userOp to Pimlico v0.7 bundler format: replace initCode with factory/factoryData.
     */
    private convertToBundlerFormat(op: Record<string, any>): Record<string, any> {
        const out = { ...op };
        if (out.initCode && out.initCode !== '0x' && out.initCode.length > 42) {
            const raw = out.initCode.slice(2);
            const factoryAddr = '0x' + raw.slice(0, 40);
            out.factory = ethers.getAddress(factoryAddr);
            out.factoryData = '0x' + raw.slice(40);
            delete out.initCode;
        } else {
            delete out.initCode;
            if (!out.factory || out.factory === '0x') delete out.factory;
            if (!out.factoryData || out.factoryData === '0x') delete out.factoryData;
        }
        return out;
    }

    constructor() {
        this.apiKey = process.env.PIMLICO_API_KEY || '';
        const isProd = process.env.NODE_ENV === 'production';
        const chainNamespace = isProd ? 'base' : 'base-sepolia';
        this.bundlerUrl = process.env.PIMLICO_BUNDLER_URL
            || `https://api.pimlico.io/v2/${chainNamespace}/rpc${this.apiKey ? `?apikey=${this.apiKey}` : ''}`;
        this.standardRpcUrl = isProd
            ? (process.env.BASE_RPC_URL || 'https://mainnet.base.org')
            : (process.env.BASE_TESTNET_RPC_URL || 'https://sepolia.base.org');
    }

    private async rpcCall<T = any>(method: string, params: any[]): Promise<T> {
        try {
            const response = await axios.post(this.bundlerUrl, {
                jsonrpc: '2.0',
                method,
                params,
                id: Date.now()
            });
            if (response.data.error) {
                throw new Error(response.data.error.message || JSON.stringify(response.data.error));
            }
            return response.data.result as T;
        } catch (error: any) {
            throw new AppError(`Bundler RPC error (${method}): ${error.message}`, 502);
        }
    }

    private async standardRpcCall<T = any>(method: string, params: any[]): Promise<T> {
        try {
            const response = await axios.post(this.standardRpcUrl, {
                jsonrpc: '2.0',
                method,
                params,
                id: Date.now()
            });
            if (response.data.error) {
                throw new Error(response.data.error.message || JSON.stringify(response.data.error));
            }
            return response.data.result as T;
        } catch (error: any) {
            throw new AppError(`Standard RPC error (${method}): ${error.message}`, 502);
        }
    }

    async sendUserOperation(op: UserOperation, entryPoint: string): Promise<string> {
        const bundlerOp = this.convertToBundlerFormat(op as any);
        return await this.rpcCall<string>('eth_sendUserOperation', [bundlerOp, entryPoint]);
    }

    async getUserOperationReceipt(userOpHash: string): Promise<{ success: boolean; transactionHash: string; blockNumber: number; } | null> {
        const result = await this.rpcCall<any>('eth_getUserOperationReceipt', [userOpHash]);
        if (!result) return null;
        return {
            success: result.success,
            transactionHash: result.receipt?.transactionHash,
            blockNumber: parseInt(result.receipt?.blockNumber || '0x0', 16)
        };
    }

    async estimateUserOperationGas(op: Partial<UserOperation>, entryPoint: string): Promise<{ callGasLimit: string; verificationGasLimit: string; preVerificationGas: string; }> {
        const bundlerOp = this.convertToBundlerFormat(op as any);
        const result = await this.rpcCall<any>('eth_estimateUserOperationGas', [bundlerOp, entryPoint]);
        return {
            callGasLimit: result.callGasLimit,
            verificationGasLimit: result.verificationGasLimit,
            preVerificationGas: result.preVerificationGas
        };
    }

    /**
     * Return the gas price fields the bundler will accept for a UserOperation.
     * Pimlico's pimlico_getUserOperationGasPrice returns three speed tiers:
     * { slow, standard, fast } each containing { maxFeePerGas, maxPriorityFeePerGas }.
     * We use the standard tier. Falls back to eth_feeHistory if not available.
     */
    async getUserOperationGasPrice(): Promise<{ maxFeePerGas: string; maxPriorityFeePerGas: string; }> {
        let result: any;
        try {
            result = await this.rpcCall<any>('pimlico_getUserOperationGasPrice', []);
        } catch (err: any) {
            console.warn('[BundlerService] pimlico_getUserOperationGasPrice threw:', err.message);
            result = null;
        }
        if (result?.standard?.maxFeePerGas) {
            return {
                maxFeePerGas: result.standard.maxFeePerGas,
                maxPriorityFeePerGas: result.standard.maxPriorityFeePerGas || result.standard.maxFeePerGas
            };
        }
        if (result) {
            console.warn('[BundlerService] pimlico_getUserOperationGasPrice returned unexpected shape:',
                JSON.stringify(result).slice(0, 500));
        }
        // Fallback: derive from pending block base fee + small priority bump.
        const feeHistory = await this.standardRpcCall<any>('eth_feeHistory', ['0x1', 'pending', [50]]);
        const baseFeeHex = feeHistory?.baseFeePerGas?.[0] || '0x0';
        const baseFee = BigInt(baseFeeHex);
        const priority = baseFee / 10n; // 10% priority bump
        return {
            maxFeePerGas: '0x' + (baseFee * 2n).toString(16),
            maxPriorityFeePerGas: '0x' + priority.toString(16)
        };
    }

    /**
     * Fetch the current nonce for a sender's smart account from the EntryPoint.
     * EntryPoint.getNonce(address sender, uint192 key) returns (uint256 nonce).
     */
    async getSenderNonce(sender: string, entryPoint: string, nonceKey: number = 0): Promise<string> {
        const data = entrypointInterface.encodeFunctionData('getNonce', [sender, nonceKey]);
        const result = await this.standardRpcCall<string>('eth_call', [{ to: entryPoint, data }, 'latest']);
        if (!result || result === '0x' || result.length < 66) {
            return '0x0';
        }
        const nonce = BigInt(result);
        return '0x' + nonce.toString(16);
    }

    getEntryPointAddress(): string {
        return process.env.ENTRYPOINT_ADDRESS || DEFAULT_ENTRYPOINT;
    }
}
