import { useState, useCallback } from 'react';

const ERC20_TRANSFER_ABI = '0xa9059cbb';

function getUsdcAddress(chainId: number): string {
  const USDC_ADDRESSES: Record<number, string> = {
    84532: '0x036eFd9011037348926609f2A377B6729024D914',
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913',
  };
  return USDC_ADDRESSES[chainId] || USDC_ADDRESSES[84532];
}

async function ensureConnectedWallet(): Promise<string> {
  const eth = window.ethereum;
  if (!eth) throw new Error('No wallet detected. Please install MetaMask or Coinbase Wallet.');
  const accounts = await eth.request({ method: 'eth_requestAccounts' });
  if (!accounts || accounts.length === 0) throw new Error('No accounts returned from wallet.');
  return accounts[0];
}

export interface CryptoPaymentParams {
  amount: number;
  recipientAddress: string;
  contentId?: string;
  creatorId?: string;
  message?: string;
}

export interface CryptoPaymentResult {
  step: number;
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
  processPayment: (params: CryptoPaymentParams) => Promise<boolean>;
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

  const processPayment = useCallback(async (params: CryptoPaymentParams): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const fromAddress = await ensureConnectedWallet();

      const eth = window.ethereum!;
      const chainId = Number(eth.chainId) || 84532;
      const usdcAddress = getUsdcAddress(chainId);

      const toAddress = params.recipientAddress.startsWith('0x')
        ? params.recipientAddress
        : `0x${params.recipientAddress}`;
      const amountInUnits = BigInt(Math.round(params.amount * 1e6));
      const paddedAddress = toAddress.slice(2).toLowerCase().padStart(64, '0');
      const data = ERC20_TRANSFER_ABI + paddedAddress + amountInUnits.toString(16).padStart(64, '0');

      const hash = await eth.request({
        method: 'eth_sendTransaction',
        params: [{
          from: fromAddress,
          to: usdcAddress,
          data,
        }],
      }) as string;

      setTxHash(hash);

      const response = await fetch('/api/v1/payments/crypto/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          txHash: hash,
          creatorId: params.creatorId,
          amountInCents: Math.round(params.amount * 100),
          transactionType: params.contentId ? 'PPV Post' : 'Tip',
          relatedId: params.contentId,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Payment verification failed.');
      }

      setStep(2);
      return true;
    } catch (err: any) {
      const message = err?.message || 'Payment failed.';
      setError(message);
      console.error('[useCryptoPayment] Error:', err);
      return false;
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
