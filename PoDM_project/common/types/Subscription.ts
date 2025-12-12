// /common/types/Subscription.ts

/**
 * Defines the possible statuses for a fan's subscription.
 */
export type SubscriptionStatus = 'active' | 'canceled' | 'expired';

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
  stripe_subscription_id?: string; // Stripe Subscription ID
  payment_method: PaymentMethod;
  created_at: string; // ISO 8601 date string
  updated_at: string; // ISO 8601 date string
}
