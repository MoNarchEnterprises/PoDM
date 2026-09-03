import { useState, useCallback } from 'react';
import { canonicalPaymentIdentifier } from '@common/paymentIdentifier';

// Canonical selectors derived from contract ABI
const APPROVE_SELECTOR   = '0x095ea7b3';   // approve(address spender, uint256 amount)
const ALLOWANCE_SELECTOR = '0xdd62ed3e';   // allowance(address owner, address spender) view returns (uint256)
const PAY_SUB_SELECTOR   = '0xe87c1a59';   // paySubscription(address token, address creator, uint256 amount, bytes32 tierIdHash, address referrer, uint256 customPlatformFeeBps)
const PAY_TIP_SELECTOR   = '0x7a02b81c';   // payTip(address token, address creator, uint256 amount, address referrer, uint256 customPlatformFeeBps)
const PAY_PPV_SELECTOR   = '0x33f2ab62';   // payPPV(address token, address creator, uint256 amount, bytes32 contentIdHash, address referrer, uint256 customPlatformFeeBps)

const ZERO_ADDRESS_HEX = '0'.repeat(64);

type PaymentType = 'Tip' | 'PPV Post' | 'PPV Message' | 'Subscription';

function getUsdcAddress(chainId: number): string {
  const USDC_ADDRESSES: Record<number, string> = {
    84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913',
  };
  return USDC_ADDRESSES[chainId] || USDC_ADDRESSES[84532];
}

function getContractAddress(): string {
  // Vite-exposed env (VITE_BASE_TESTNET_CONTRACT_ADDRESS on Base Sepolia)
  return import.meta.env.VITE_BASE_CONTRACT_ADDRESS
    || import.meta.env.VITE_BASE_TESTNET_CONTRACT_ADDRESS
    || '';
}

function padAddress(addr: string): string {
  return addr.slice(2).toLowerCase().padStart(64, '0');
}

function padUint(value: bigint): string {
  return value.toString(16).padStart(64, '0');
}

async function ensureConnectedWallet(): Promise<string> {
  const eth = window.ethereum;
  if (!eth) throw new Error('No wallet detected. Please install MetaMask or Coinbase Wallet.');
  const accounts = await eth.request({ method: 'eth_requestAccounts' });
  if (!accounts || accounts.length === 0) throw new Error('No accounts returned from wallet.');
  return accounts[0];
}

/**
 * Read ERC-20 allowance(owner, spender) via eth_call.
 * Returns the value as a bigint (in USDC 6-decimals units).
 */
async function readAllowance(usdcAddress: string, owner: string, spender: string): Promise<bigint> {
  const eth = window.ethereum!;
  const data = ALLOWANCE_SELECTOR + padAddress(owner) + padAddress(spender);
  const result = await eth.request({
    method: 'eth_call',
    params: [{ to: usdcAddress, data }, 'latest'],
  }) as string;
  if (!result || result === '0x') return 0n;
  return BigInt(result);
}

/**
 * Send ERC-20 approve(spender, amountInUnits) for exact payment amount and wait for the receipt.
 * Returns the approve transaction hash. (Remediates H-01 unlimited approval vulnerability).
 */
async function approveContract(usdcAddress: string, owner: string, spender: string, amountInUnits: bigint): Promise<string> {
  const eth = window.ethereum!;
  const data = APPROVE_SELECTOR + padAddress(spender) + padUint(amountInUnits);
  const txHash = await eth.request({
    method: 'eth_sendTransaction',
    params: [{ from: owner, to: usdcAddress, data }],
  }) as string;
  await waitForReceipt(txHash);
  return txHash;
}

interface EthReceipt {
  transactionHash: string;
  status: string;
  blockNumber: string;
}

async function waitForReceipt(txHash: string, timeoutMs = 60000): Promise<EthReceipt> {
  const eth = window.ethereum!;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const receipt = await eth.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    }) as EthReceipt | null;
    if (receipt) return receipt;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`Transaction ${txHash} not mined within ${timeoutMs}ms`);
}

export interface CryptoPaymentParams {
  amount: number;            // amount in USD (e.g. 5.00 for $5)
  recipientAddress: string;  // creator wallet address (kept for backwards compat)
  contentId?: string;        // for PPV
  creatorId?: string;
  message?: string;
  paymentType?: PaymentType;
  tierId?: string;           // for subscriptions
  referrerAddress?: string;  // referrer wallet for the on-chain referral split ('' = none)
  platformFeeBps?: number;   // platform fee BPS (e.g. 1250 = 12.5%, 1000 = 10%)
}

export interface CryptoPaymentOutcome {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface CryptoPaymentResult {
  step: number;
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
  processPayment: (params: CryptoPaymentParams) => Promise<CryptoPaymentOutcome>;
  reset: () => void;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useCryptoPayment(): CryptoPaymentResult {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const processPayment = useCallback(async (params: CryptoPaymentParams): Promise<CryptoPaymentOutcome> => {
    setIsLoading(true);
    setError(null);

    try {
      const contractAddress = getContractAddress();
      if (!contractAddress) throw new Error('Contract address not configured (VITE_BASE_TESTNET_CONTRACT_ADDRESS).');

      const fromAddress = await ensureConnectedWallet();
      const eth = window.ethereum!;

      // Enforce active network binding (FE-01 network mismatch protection)
      const expectedChainId = Number(import.meta.env.VITE_CHAIN_ID) || 84532;
      const rawChainId = eth.chainId ? (typeof eth.chainId === 'string' ? parseInt(eth.chainId, 16) : Number(eth.chainId)) : 0;

      if (rawChainId && rawChainId !== expectedChainId) {
        const expectedHex = '0x' + expectedChainId.toString(16);
        try {
          await eth.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: expectedHex }],
          });
        } catch {
          throw new Error(`Network Mismatch: Wallet is on chain ${rawChainId}, but active network is ${expectedChainId}. Please switch network in your wallet.`);
        }
      }

      const usdcAddress = getUsdcAddress(expectedChainId);

      const creatorWallet = params.recipientAddress.startsWith('0x')
        ? params.recipientAddress
        : `0x${params.recipientAddress}`;

      const amountInUnits = BigInt(Math.round(params.amount * 1e6)); // USDC 6 decimals

      // 1. Ensure exact USDC allowance to the PoDM contract.
      const currentAllowance = await readAllowance(usdcAddress, fromAddress, contractAddress);
      if (currentAllowance < amountInUnits) {
        const approveTx = await approveContract(usdcAddress, fromAddress, contractAddress, amountInUnits);
        console.log('[useCryptoPayment] Exact USDC approve tx:', approveTx);
      }

      // 2. Build calldata for the appropriate PoDM contract function.
      const type: PaymentType = params.paymentType
        || (params.contentId ? 'PPV Post' : 'Tip');

      const referrerHex = params.referrerAddress && params.referrerAddress.startsWith('0x')
        ? padAddress(params.referrerAddress)
        : ZERO_ADDRESS_HEX;

      const feeBpsHex = padUint(BigInt(params.platformFeeBps ?? 1500));

      let selector: string;
      let dataHex: string;
      if (type === 'Subscription') {
        selector = PAY_SUB_SELECTOR;
        const tierIdHash = canonicalPaymentIdentifier(params.tierId || 'default').slice(2);
        dataHex = selector + padAddress(usdcAddress) + padAddress(creatorWallet) + padUint(amountInUnits) + tierIdHash + referrerHex + feeBpsHex;
      } else if (type === 'Tip') {
        selector = PAY_TIP_SELECTOR;
        dataHex = selector + padAddress(usdcAddress) + padAddress(creatorWallet) + padUint(amountInUnits) + referrerHex + feeBpsHex;
      } else { // PPV Post or PPV Message
        selector = PAY_PPV_SELECTOR;
        const contentIdHash = canonicalPaymentIdentifier(params.contentId || 'content').slice(2);
        dataHex = selector + padAddress(usdcAddress) + padAddress(creatorWallet) + padUint(amountInUnits) + contentIdHash + referrerHex + feeBpsHex;
      }

      // Register before broadcast so a tab close cannot orphan a successful
      // chain payment from the server's reconciliation queue.
      const clientIntentId = crypto.randomUUID();
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const intentResponse = await fetch('/api/v1/payments/crypto/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          clientIntentId,
          creatorId: params.creatorId,
          amountInCents: Math.round(params.amount * 100),
          transactionType: type,
          relatedId: params.contentId || params.tierId,
        }),
      });
      if (!intentResponse.ok) {
        const result = await intentResponse.json();
        throw new Error(result.message || 'Payment intent registration failed.');
      }
      const intentResult = await intentResponse.json();
      const serverPaymentIntentId = intentResult.data?.intentId;

      // 3. Send the contract payX call.
      const hash = await eth.request({
        method: 'eth_sendTransaction',
        params: [{ from: fromAddress, to: contractAddress, data: dataHex }],
      }) as string;

      setTxHash(hash);
      await fetch('/api/v1/payments/crypto/intent/transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ paymentIntentId: serverPaymentIntentId, txHash: hash }),
      });
      await waitForReceipt(hash);

      // 4. Verify on the backend so the DB records a verified transaction.
      const token = authToken;
      const response = await fetch('/api/v1/payments/crypto/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          txHash: hash,
          creatorId: params.creatorId,
          amountInCents: Math.round(params.amount * 100),
          transactionType: type,
          relatedId: params.contentId || params.tierId,
          paymentIntentId: serverPaymentIntentId,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Payment verification failed.');
      }

      setStep(2);
      return { success: true, txHash: hash };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed.';
      setError(message);
      console.error('[useCryptoPayment] Error:', err);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setStep(1);
    setIsLoading(false);
    setError(null);
    setTxHash(null);
  }, []);

  return {
    step,
    isLoading,
    error,
    txHash,
    processPayment,
    reset,
    setStep,
    setError,
    setIsLoading,
  };
}

export default useCryptoPayment;
