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
  _id: string; // Unique identifier for the subscription
  fanId: string; // The ID of the fan (user)
  creatorId: string; // The ID of the creator (user)
  tierId: string; // The ID of the specific SubscriptionTier
  price: number; // The price paid at the time of subscription (in cents)
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  startDate: string; // ISO 8601 date string
  endDate?: string; // ISO 8601 date string, for canceled/expired subscriptions
  nextBillingDate?: string; // ISO 8601 date string, for active subscriptions
  paymentMethod: PaymentMethod;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
}
