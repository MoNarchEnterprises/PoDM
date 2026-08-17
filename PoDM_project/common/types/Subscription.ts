// /common/types/Subscription.ts

/**
 * Defines the possible statuses for a fan's subscription.
 */
export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'pending';

/**
 * Defines the billing cycle for a subscription.
 */
export type BillingCycle = 'monthly' | 'yearly';

/**
 * Defines the possible payment method types.
 */
export type PaymentMethodType = 'card' | 'paypal';

/**
 * Defines the structure for the payment method used for a subscription.
 * This should only contain non-sensitive information safe for the frontend.
 */
export interface PaymentMethod {
  type: PaymentMethodType;
  last4: string; // e.g., '4242'
  expiry: string; // e.g., '12/25'
}

/**
 * The main Subscription interface, representing a fan's subscription to a creator.
 */
export interface Subscription {
  id: number; // Unique identifier for the subscription
  fan_id: string; // The ID of the fan (user)
  creator_id: string; // The ID of the creator (user)
  tier_id: string; // The ID of the specific SubscriptionTier
  price: number; // The price paid at the time of subscription (in cents)
  billing_cycle: BillingCycle;
  status: SubscriptionStatus;
  start_date: string; // ISO 8601 date string
  end_date?: string; // ISO 8601 date string, for canceled/expired subscriptions
  next_billing_date?: string; // ISO 8601 date string, for active subscriptions
  blockchain_tx_hash?: string;
  fan_wallet_address?: string; // Fan's wallet that approved the recurring allowance
  max_allowance?: number; // Max USDC allowance approved by fan (in USDC units, not cents)
  payment_method: PaymentMethod;
  renewal_attempts?: number; // Number of consecutive failed renewal attempts (0 = healthy)
  renewal_locked_at?: string | null; // ISO 8601 timestamp when content was locked due to failed renewal
  renewal_claim_id?: string | null;
  renewal_claimed_at?: string | null;
  renewal_pending_tx_hash?: string | null;
  renewal_status?: 'PENDING' | 'PROCESSING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED' | 'RETRYABLE' | null;
  renewal_id?: string | null;
  renewal_period?: string | null;
  renewal_started_at?: string | null;
  renewal_confirmed_at?: string | null;
  renewal_error?: string | null;
  created_at: string; // ISO 8601 date string
  updated_at: string; // ISO 8601 date string
}
