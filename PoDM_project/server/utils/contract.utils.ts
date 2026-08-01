import { ethers, Interface } from 'ethers';
import { PODM_CONTRACT_ABI, ERC20_ABI, EVENT_TOPICS } from '../../common/contractConfig';

export interface ContractConfig {
    contractAddress: string;
    rpcUrl: string;
    usdcAddress: string;
    chainId: number;
    isProd: boolean;
}

const podmInterface = new Interface(PODM_CONTRACT_ABI);
const erc20Interface = new Interface(ERC20_ABI);

/**
 * Get unified contract configuration (address, RPC, USDC address, chain ID)
 */
export function getContractConfig(): ContractConfig {
    const isProd = process.env.NODE_ENV === 'production';
    const contractAddress = (isProd ? process.env.BASE_CONTRACT_ADDRESS : process.env.BASE_TESTNET_CONTRACT_ADDRESS) || '';
    const rpcUrl = isProd
        ? (process.env.BASE_RPC_URL || 'https://mainnet.base.org')
        : (process.env.BASE_TESTNET_RPC_URL || 'https://sepolia.base.org');
    const usdcAddress = isProd
        ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913'
        : '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
    const chainId = isProd ? 8453 : 84532;

    return { contractAddress, rpcUrl, usdcAddress, chainId, isProd };
}

export function getPodmInterface(): Interface {
    return podmInterface;
}

export function getErc20Interface(): Interface {
    return erc20Interface;
}

export function encodePaySubscription(
    tokenAddress: string,
    creator: string,
    amount: bigint | string | number,
    tierIdHash: string,
    referrer: string,
    customPlatformFeeBps: number
): string {
    return podmInterface.encodeFunctionData('paySubscription', [
        tokenAddress, creator, amount, tierIdHash, referrer, customPlatformFeeBps
    ]);
}

export function encodePayTip(
    tokenAddress: string,
    creator: string,
    amount: bigint | string | number,
    referrer: string,
    customPlatformFeeBps: number
): string {
    return podmInterface.encodeFunctionData('payTip', [
        tokenAddress, creator, amount, referrer, customPlatformFeeBps
    ]);
}

export function encodePayPPV(
    tokenAddress: string,
    creator: string,
    amount: bigint | string | number,
    contentIdHash: string,
    referrer: string,
    customPlatformFeeBps: number
): string {
    return podmInterface.encodeFunctionData('payPPV', [
        tokenAddress, creator, amount, contentIdHash, referrer, customPlatformFeeBps
    ]);
}

export function encodeProcessRenewal(
    tokenAddress: string,
    fan: string,
    creator: string,
    amount: bigint | string | number,
    referrer: string,
    customPlatformFeeBps: number
): string {
    return podmInterface.encodeFunctionData('processRenewal', [
        tokenAddress, fan, creator, amount, referrer, customPlatformFeeBps
    ]);
}

export function encodeProcessPayout(
    creator: string,
    amount: bigint | string | number
): string {
    return podmInterface.encodeFunctionData('processPayout', [creator, amount]);
}

export function encodeApprove(spender: string, amount: bigint | string | number): string {
    return erc20Interface.encodeFunctionData('approve', [spender, amount]);
}

export function parsePaymentLog(log: { topics: string[]; data: string }) {
    return podmInterface.parseLog(log);
}

export { EVENT_TOPICS };
