/**
 * PoDM Autonomous QA Test Suite — Live Web3 Helper
 * Handles Base Sepolia RPC provider queries, ethers contract interaction, and fee split math
 */

import { ethers } from 'ethers';
import { BlockchainHelper, FeeSplitResult } from './blockchain.helper';

export class Web3Helper {
  public static readonly BASE_SEPOLIA_CHAIN_ID = 84532;
  public static readonly RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
  public static readonly CONTRACT_ADDRESS =
    process.env.BASE_TESTNET_CONTRACT_ADDRESS || '0xa8f480C42C6216a35a435424409d8e0932ee66e9';

  private static provider: ethers.JsonRpcProvider | null = null;

  public static getProvider(): ethers.JsonRpcProvider {
    if (!this.provider) {
      this.provider = new ethers.JsonRpcProvider(this.RPC_URL);
    }
    return this.provider;
  }

  public static computeFeeSplit(
    amountWei: bigint,
    platformFeeBps: bigint = 1250n,
    referralFeeBps: bigint = 100n,
    hasReferrer: boolean = false
  ): FeeSplitResult {
    return BlockchainHelper.computeFeeSplit(amountWei, platformFeeBps, referralFeeBps, hasReferrer);
  }

  public static async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    try {
      const provider = this.getProvider();
      return await provider.getTransactionReceipt(txHash);
    } catch {
      return null;
    }
  }

  public static async checkRPCHealth(): Promise<boolean> {
    try {
      const provider = this.getProvider();
      const network = await provider.getNetwork();
      return Number(network.chainId) === this.BASE_SEPOLIA_CHAIN_ID || Number(network.chainId) > 0;
    } catch {
      return false;
    }
  }
}
