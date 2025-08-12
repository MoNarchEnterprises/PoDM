// /common/types/Creator.ts

import { User } from './User';

/**
 * Defines the structure for a single subscription tier offered by a creator.
 */
export interface SubscriptionTier {
  id: string;
  name: string;
  price: number; // Stored in cents on backend, but can be number here
  features: string[];
  subscriberCount: number;
}

/**
 * Defines the structure for a creator's bank account details for payouts.
 */
export interface BankAccount {
  accountHolder: string;
  accountNumber: string; // Should be stored securely and masked on frontend
  routingNumber: string; // Should be stored securely and masked on frontend
}

/**
 * Defines the possible methods for creator payouts.
 */
export type PayoutMethod = 'bank_transfer' | 'paypal';

/**
 * Defines the schedule for automatic creator payouts.
 */
export type PayoutSchedule = 'weekly' | 'bi-weekly' | 'monthly';

/**
 * Defines the structure for a creator's payout settings.
 */
export interface PayoutSettings {
  method: PayoutMethod;
  bankAccount?: BankAccount; // Optional if method is PayPal
  paypalEmail?: string; // Optional if method is bank_transfer
  schedule: PayoutSchedule;
  minimumThreshold: number;
}

/**
 * Defines the possible default visibility settings for new content.
 */
export type ContentVisibility = 'subscribers_only' | 'pay_per_view';

/**
 * Defines the structure for a creator's watermark settings.
 */
export interface WatermarkSettings {
  enabled: boolean;
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number; // A value between 0 and 1
}

/**
 * Defines the structure for a creator's default content settings.
 */
export interface ContentSettings {
  defaultVisibility: ContentVisibility;
  defaultPrice: number;
  watermark: WatermarkSettings;
}

/**
 * The Creator interface, extending the base User with all creator-specific data.
 */
export interface Creator extends User {
  creatorData: {
    subscriptionTiers: SubscriptionTier[];
    welcomeMessage: {
      message: string;
      freeContentId?: string;
      isActive: boolean;
    };
    payoutSettings: PayoutSettings;
    contentSettings: ContentSettings;
  };
}
