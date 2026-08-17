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

export type ChainNetwork = 'testnet' | 'mainnet';

/**
 * Get active blockchain network ('testnet' | 'mainnet').
 * Driven explicitly by CHAIN_NETWORK env var (defaults to 'testnet').
 */
export function getChainNetwork(): ChainNetwork {
    const network = (process.env.CHAIN_NETWORK || '').toLowerCase().trim();
    if (network === 'mainnet') return 'mainnet';
    return 'testnet';
}

export function getRpcUrl(): string {
    const isMainnet = getChainNetwork() === 'mainnet';
    return isMainnet
        ? (process.env.BASE_RPC_URL || 'https://mainnet.base.org')
        : (process.env.BASE_TESTNET_RPC_URL || 'https://sepolia.base.org');
}

export function getUsdcAddress(): string {
    const isMainnet = getChainNetwork() === 'mainnet';
    return isMainnet
        ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913'
        : '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
}

export function getChainId(): number {
    return getChainNetwork() === 'mainnet' ? 8453 : 84532;
}

export function getChainNamespace(): 'base' | 'base-sepolia' {
    return getChainNetwork() === 'mainnet' ? 'base' : 'base-sepolia';
}

export function getSmartAccountFactoryAddress(): string {
    const isMainnet = getChainNetwork() === 'mainnet';
    if (isMainnet) {
        return process.env.SMART_ACCOUNT_FACTORY_ADDRESS_MAINNET || process.env.SMART_ACCOUNT_FACTORY_ADDRESS || '0x91E60e0613810449d098b0b5Ec8b51A0FE8c8985';
    }
    return process.env.SMART_ACCOUNT_FACTORY_ADDRESS || '0x91E60e0613810449d098b0b5Ec8b51A0FE8c8985';
}

export function getEntryPointAddress(): string {
    const isMainnet = getChainNetwork() === 'mainnet';
    if (isMainnet) {
        return process.env.ENTRYPOINT_ADDRESS_MAINNET || process.env.ENTRYPOINT_ADDRESS || '0x0000000071727De22E5E9d8BAf0edAc6f37da032';
    }
    return process.env.ENTRYPOINT_ADDRESS || '0x0000000071727De22E5E9d8BAf0edAc6f37da032';
}

/**
 * Get unified contract configuration (address, RPC, USDC address, chain ID).
 * Fails fast if the active network's contract address is unconfigured or a placeholder.
 */
export function getContractConfig(): ContractConfig {
    const network = getChainNetwork();
    const isMainnet = network === 'mainnet';
    const contractAddress = isMainnet
        ? (process.env.BASE_CONTRACT_ADDRESS || '')
        : (process.env.BASE_TESTNET_CONTRACT_ADDRESS || '');

    if (!contractAddress || contractAddress.startsWith('PLACEHOLDER_')) {
        throw new Error(`Invalid or unconfigured smart contract address for active network "${network}": "${contractAddress}"`);
    }

    const rpcUrl = getRpcUrl();
    const usdcAddress = getUsdcAddress();
    const chainId = getChainId();
    const isProd = process.env.NODE_ENV === 'production';

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
    renewalId: string,
    tokenAddress: string,
    fan: string,
    creator: string,
    amount: bigint | string | number,
    referrer: string,
    customPlatformFeeBps: number
): string {
    return podmInterface.encodeFunctionData('processRenewal', [
        renewalId, tokenAddress, fan, creator, amount, referrer, customPlatformFeeBps
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
