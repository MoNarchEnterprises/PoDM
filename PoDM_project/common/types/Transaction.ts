// /common/types/Transaction.ts

/**
 * Defines the possible types of financial transactions on the platform.
 */
export type TransactionType = 'Subscription' | 'Tip' | 'PPV Message' | 'PPV Post';

/**
 * Defines the possible statuses for a transaction.
 */
export type TransactionStatus = 'Pending' | 'Cleared' | 'Failed' | 'Refunded';

/**
 * The main Transaction interface, representing a single financial event.
 */
export interface Transaction {
  _id: string; // Unique identifier for the transaction
  fanId: string; // The ID of the fan who made the payment
  creatorId: string; // The ID of the creator who received the payment
  type: TransactionType;
  amount: number; // The total amount paid by the fan (in cents)
  platformFee: number; // The portion of the amount taken by the platform (in cents)
  creatorPayout: number; // The portion of the amount paid out to the creator (in cents)
  status: TransactionStatus;
  relatedContentId?: string; // Optional: The ID of the content this transaction is related to (e.g., a PPV post)
  paymentGatewayId: string; // The ID from the payment processor (e.g., Stripe charge ID)
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
}
