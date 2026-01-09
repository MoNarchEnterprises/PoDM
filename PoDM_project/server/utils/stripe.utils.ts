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

    // If the Stripe customer ID already exists, we must verify it exists in Stripe (in case of Test/Live switch)
    if (user.stripe_customer_id) {
        try {
            // Attempt to retrieve it to ensure it's valid
            await stripe.customers.retrieve(user.stripe_customer_id);
            return user.stripe_customer_id;
        } catch (error: any) {
            // If Stripe says "No such customer", it means our DB is out of sync (Test vs Live mode)
            if (error.code === 'resource_missing') {
                console.warn(`[Stripe Util] Customer ${user.stripe_customer_id} not found in Stripe. Cleaning up DB and creating new one.`);
                // Reset the ID in memory so the code below creates a new one
                user.stripe_customer_id = undefined;
                // Optionally update DB here to be safe, though the create flow below will overwrite it anyway.
            } else {
                // If it's another error (API down, etc), throw it up
                console.error(`[Stripe Util] Error verifying customer ${user.stripe_customer_id}:`, error);
                throw error;
            }
        }
    }

    // User doesn't have a valid Stripe ID yet (or we just cleared it), so we create one.

    const customer = await stripe.customers.create({
        email: user.email,
        name: (user as any).fullName || 'No Name', // Fallback if fullName is missing
        metadata: {
            // This links the Stripe customer back to our internal user ID
            pod_user_id: user.id,
        },
    });

    // Save the new Stripe customer ID to our database for future use
    await UserModel.updateProfile(userId, { stripe_customer_id: customer.id });

    return customer.id;
};