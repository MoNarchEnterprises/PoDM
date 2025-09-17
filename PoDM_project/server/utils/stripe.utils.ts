// server/utils/stripe.utils.ts

import stripe from '../config/stripeClient';
import * as UserModel from '../models/user.model';
import { AppError } from '../middleware/error.middleware';

/**
 * Finds a user's Stripe Customer ID from our database, or creates a new one if it doesn't exist.
 * This is the single source of truth for this operation.
 * @param userId The user's UUID from our database.
 * @returns The Stripe Customer ID (cus_...).
 */
export const getOrCreateStripeCustomer = async (userId: string): Promise<string> => {
    const user = await UserModel.findUserById(userId);
    if (!user) {
        throw new AppError('User not found while trying to get/create Stripe customer.', 404);
    }

    // If the Stripe customer ID already exists on their profile, return it.
    if (user.stripe_customer_id) {
        return user.stripe_customer_id;
    }

    // User doesn't have a Stripe ID yet, so we create one.
    console.log(`[Stripe Util] Creating new Stripe customer for user: ${userId}`);
    // --- CRITICAL DEBUG LOG ---
    console.log(`[Stripe Util] User object:`, JSON.stringify(user, null, 2));
    // --- END CRITICAL DEBUG LOG ---
    const customer = await stripe.customers.create({
        email: user.email,
        name: (user as any).fullName || 'No Name', // Fallback if fullName is missing
        metadata: {
            // This links the Stripe customer back to our internal user ID
            pod_user_id: user._id,
        },
    });

    // Save the new Stripe customer ID to our database for future use
    await UserModel.updateProfile(userId, { stripe_customer_id: customer.id });
    
    return customer.id;
};