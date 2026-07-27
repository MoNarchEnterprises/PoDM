import supabase from '../config/supabaseClient';
import { AppError } from '../middleware/error.middleware';
import { ethers, Interface } from 'ethers';
import axios from 'axios';
import { SmartAccountInfo } from '../../common/types/EmbeddedWallet';

const DEFAULT_FACTORY = '0x91E60e0613810449d098b0b5Ec8b51A0FE8c8985';

function getFactoryAddress(): string {
    return process.env.SMART_ACCOUNT_FACTORY_ADDRESS || DEFAULT_FACTORY;
}

function getRpcUrl(): string {
    const isProd = process.env.NODE_ENV === 'production';
    return isProd
        ? (process.env.BASE_RPC_URL || 'https://mainnet.base.org')
        : (process.env.BASE_TESTNET_RPC_URL || 'https://sepolia.base.org');
}

// SimpleAccountFactory v0.7: getAddress(address owner, uint256 salt) returns (address)
// and createAccount(address owner, uint256 salt) returns (address account)
const FACTORY_ABI = [
    'function getAddress(address owner, uint256 salt) view returns (address)',
    'function createAccount(address owner, uint256 salt) returns (address account)'
];

const factoryInterface = new Interface(FACTORY_ABI);

/**
 * Derive the counterfactual smart account address for an owner via the
 * SimpleAccountFactory's `getAddress` view function (real on-chain CREATE2).
 */
export const getSmartAccountAddress = async (ownerAddress: string, salt: number = 0): Promise<string> => {
    const factory = getFactoryAddress();
    const data = factoryInterface.encodeFunctionData('getAddress', [ownerAddress, salt]);
    try {
        const response = await axios.post(getRpcUrl(), {
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{ to: factory, data }, 'latest'],
            id: 1
        });
        if (response.data.error) {
            throw new Error(response.data.error.message);
        }
        const resultHex = response.data.result;
        if (!resultHex || resultHex === '0x' || resultHex.length < 42) {
            throw new AppError('Factory returned no address. Verify SMART_ACCOUNT_FACTORY_ADDRESS.', 500);
        }
        return ethers.getAddress('0x' + resultHex.slice(-40));
    } catch (error: any) {
        if (error instanceof AppError) throw error;
        throw new AppError(`Failed to derive smart account address: ${error.message}`, 500);
    }
};

/**
 * Build the ERC-4337 v0.7 `initCode` (factoryAddress + createAccount calldata)
 * required for the first UserOperation that deploys the smart account.
 * Returns empty string when no deployment is needed.
 */
export const buildInitCode = (ownerAddress: string, salt: number = 0): string => {
    const factory = getFactoryAddress();
    const factoryData = factoryInterface.encodeFunctionData('createAccount', [ownerAddress, salt]);
    return factory.toLowerCase() + factoryData.slice(2);
};

export const isDeployed = async (smartAccountAddress: string): Promise<boolean> => {
    try {
        const response = await axios.post(getRpcUrl(), {
            jsonrpc: '2.0',
            method: 'eth_getCode',
            params: [smartAccountAddress, 'latest'],
            id: 1
        });
        const code = response.data?.result;
        return typeof code === 'string' && code !== '0x' && code !== '0x0';
    } catch (error: any) {
        throw new AppError(`RPC error checking deployment status: ${error.message}`, 500);
    }
};

export const getOrCreateSmartAccount = async (userId: string, ownerAddress: string): Promise<SmartAccountInfo> => {
    const factoryAddress = getFactoryAddress();

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('smart_account_address')
        .eq('id', userId)
        .single();

    if (error) {
        throw new AppError(`Failed to fetch user profile: ${error.message}`, 500);
    }

    let address = profile?.smart_account_address;

    if (!address) {
        address = await getSmartAccountAddress(ownerAddress, 0);
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ smart_account_address: address })
            .eq('id', userId);

        if (updateError) {
            console.error('[SmartAccountService] Failed to save smart account address', updateError.message);
        }
    }

    const deployed = await isDeployed(address);

    const initCode = deployed ? '' : buildInitCode(ownerAddress, 0);

    return {
        address,
        factoryAddress,
        isDeployed: deployed,
        ownerAddress,
        initCode
    };
};
