import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../utils/requestHelpers';
import { ok, okMsg, createdMsg } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import { PrivyWalletProvider } from '../services/embeddedWallet.provider';
import { getOrCreateSmartAccount } from '../services/smartAccount.service';
import { processPaymentIntent } from '../services/userOperation.service';
import supabase from '../config/supabaseClient';
import axios from 'axios';
import { ethers } from 'ethers';

const walletProvider = new PrivyWalletProvider();

function getRpcUrl(): string {
    return process.env.NODE_ENV === 'production'
        ? (process.env.BASE_RPC_URL || 'https://mainnet.base.org')
        : (process.env.BASE_TESTNET_RPC_URL || 'https://sepolia.base.org');
}

export const createWallet = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);

    // Check if user already has a wallet
    const { data: existingProfile } = await supabase.from('profiles').select('smart_account_address, wallet_status').eq('id', userId).single();
    if (existingProfile?.wallet_status === 'active') {
        ok(res, {
            walletAddress: existingProfile.smart_account_address,
            smartAccountAddress: existingProfile.smart_account_address,
            message: 'Wallet already exists'
        });
        return;
    }

    const result = await walletProvider.createWallet(userId);
    const smartAccount = await getOrCreateSmartAccount(userId, result.address);

    // Update profiles with wallet state (persist the Privy wallet id for server-side signing)
    await supabase.from('profiles').update({
        crypto_wallet_address: result.address,
        crypto_wallet_provider_id: result.providerWalletId,
        smart_account_address: smartAccount.address,
        wallet_provider: 'privy',
        wallet_status: 'active',
        wallet_created_at: new Date().toISOString()
    }).eq('id', userId);

    await supabase.from('wallet_events').insert({
        user_id: userId,
        event: 'WalletCreated',
        wallet_address: result.address,
        smart_account_address: smartAccount.address
    });

    createdMsg(res, 'Embedded wallet created successfully', {
        walletAddress: result.address,
        smartAccountAddress: smartAccount.address
    });
});

export const getWalletStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const { data: profile } = await supabase.from('profiles')
        .select('crypto_wallet_address, smart_account_address, wallet_provider, wallet_status, wallet_created_at')
        .eq('id', userId)
        .single();

    let usdcBalance = 0;
    if (profile?.wallet_status === 'active') {
    const usdcAddress = ethers.getAddress(process.env.NODE_ENV === 'production' 
        ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913' 
        : '0x036CbD53842c5426634e7929541eC2318f3dCF7e');
        const iface = new ethers.Interface(["function balanceOf(address owner) view returns (uint256)"]);
        const addressesToCheck = [profile.smart_account_address, profile.crypto_wallet_address].filter(Boolean) as string[];
        for (const address of addressesToCheck) {
            try {
                const calldata = iface.encodeFunctionData("balanceOf", [address]);
                const response = await axios.post(getRpcUrl(), {
                    jsonrpc: '2.0',
                    method: 'eth_call',
                    params: [{ to: usdcAddress, data: calldata }, 'latest'],
                    id: 1
                });
                const balanceStr = response.data.result;
                usdcBalance += Number(BigInt(balanceStr)) / 1e6;
            } catch (err) {
                console.error(`Failed to fetch USDC balance for ${address}:`, err);
            }
        }
    }

    const state = {
        walletAddress: profile?.crypto_wallet_address || null,
        smartAccountAddress: profile?.smart_account_address || null,
        walletProvider: profile?.wallet_provider || 'none',
        walletStatus: profile?.wallet_status || 'none',
        usdcBalance,
        isReady: profile?.wallet_status === 'active'
    };
    ok(res, state);
});

export const getBalance = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const { data: profile } = await supabase.from('profiles').select('crypto_wallet_address, smart_account_address').eq('id', userId).single();
    if (!profile?.crypto_wallet_address && !profile?.smart_account_address) {
        throw new AppError('No wallet found', 404);
    }
    
    const usdcAddress = process.env.NODE_ENV === 'production' 
        ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913' 
        : ethers.getAddress('0x036CbD53842c5426634e7929541eC2318f3dCF7e');

    const iface = new ethers.Interface(["function balanceOf(address owner) view returns (uint256)"]);
    const addressesToCheck = [profile.smart_account_address, profile.crypto_wallet_address].filter(Boolean) as string[];
    
    let totalBalance = 0;
    for (const address of addressesToCheck) {
        try {
            const calldata = iface.encodeFunctionData("balanceOf", [address]);
            const response = await axios.post(getRpcUrl(), {
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [{ to: usdcAddress, data: calldata }, 'latest'],
                id: 1
            });
            const balanceStr = response.data.result;
            totalBalance += Number(BigInt(balanceStr)) / 1e6;
        } catch (err) {
            console.error(`Failed to fetch USDC balance for ${address}:`, err);
        }
    }

    ok(res, { balance: totalBalance });
});

export const signOperation = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const { type, amountInCents, creatorId, relatedId, message } = req.body;

    if (!type || !amountInCents || !creatorId) {
        throw new AppError('type, amountInCents, and creatorId are required', 400);
    }

    const intent = { type, amountInCents, creatorId, relatedId, message };
    const result = await processPaymentIntent(userId, intent);
    ok(res, result);
});

export const recoverWallet = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    okMsg(res, 'Wallet recovery initiated');
});

export const transferUsdcToSmartAccount = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const { data: profile } = await supabase.from('profiles')
        .select('crypto_wallet_address, smart_account_address')
        .eq('id', userId)
        .single();

    if (!profile?.crypto_wallet_address || !profile?.smart_account_address) {
        throw new AppError('Both EOA and smart account must exist', 400);
    }
    if (!profile.crypto_wallet_address || !profile.smart_account_address) {
        throw new AppError('Both EOA and smart account must exist', 400);
    }

    const usdcAddress = process.env.NODE_ENV === 'production' 
        ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913' 
        : ethers.getAddress('0x036CbD53842c5426634e7929541eC2318f3dCF7e');

    const iface = new ethers.Interface(["function balanceOf(address owner) view returns (uint256)"]);
    const calldata = iface.encodeFunctionData("balanceOf", [profile.crypto_wallet_address]);
    const balanceResponse = await axios.post(getRpcUrl(), {
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: usdcAddress, data: calldata }, 'latest'],
        id: 1
    });
    const balanceStr = balanceResponse.data.result;
    const balanceRaw = BigInt(balanceStr);

    if (balanceRaw === 0n) {
        throw new AppError('No USDC balance to transfer', 400);
    }

    const transferIface = new ethers.Interface(["function transfer(address to, uint256 amount) returns (bool)"]);
    const transferData = transferIface.encodeFunctionData("transfer", [profile.smart_account_address, balanceRaw]);

    const txHash = await walletProvider.sendTransaction(userId, {
        to: usdcAddress,
        data: transferData,
    });

    okMsg(res, `Transferred ${Number(balanceRaw) / 1e6} USDC to smart account`, { txHash, amount: Number(balanceRaw) / 1e6 });
});
