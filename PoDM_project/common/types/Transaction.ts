// /common/types/Transaction.ts

/**
 * Defines the possible types of financial transactions on the platform.
 */
export type TransactionType = 'Subscription' | 'SubscriptionRenewal' | 'Tip' | 'PPV Message' | 'PPV Post' | 'Payout' | 'OnRamp' | 'ReferralBonus';

/**
 * Defines the possible statuses for a transaction.
 */
export type TransactionStatus = 'Pending' | 'Cleared' | 'Failed' | 'Refunded';

/**
 * The main Transaction interface, representing a single financial event.
 */
export interface Transaction {
  id: string; // Unique identifier for the transaction
  fan_id: string; // The ID of the fan who made the payment
  creator_id: string; // The ID of the creator who received the payment
  type: TransactionType;
  amount: number; // The total amount paid by the fan (in cents)
  platform_fee: number; // The portion of the amount taken by the platform (in cents)
  creator_payout: number; // The portion of the amount paid out to the creator (in cents)
  referral_fee?: number; // Optional: cents deducted from platform_fee, owed to referrer
  referrer_id?: string; // Optional: user ID of the referrer who receives the referral fee
  status: TransactionStatus;
  related_content_id?: string; // Optional: The ID of the content this transaction is related to (e.g., a PPV post)
  message?: string; // Optional: A message from the fan (for tips) or a reference ID (for messages)
  blockchain_tx_hash?: string;
  payer_wallet_address?: string;
  user_operation_hash?: string;
  gas_sponsored?: boolean;
  payment_method?: 'crypto' | 'card_onramp' | 'embedded_wallet' | 'referral_bonus';
  payment_currency?: 'USD' | 'USDC';
  chain_id?: number;
  blockchain_block_number?: number;
  blockchain_block_hash?: string;
  created_at: string; // ISO 8601 date string
  updated_at?: string; // ISO 8601 date string
}
