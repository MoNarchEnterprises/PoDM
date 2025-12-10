
import stripe from '../config/stripeClient'; // <-- ADD THIS LINE
import * as UserModel from '../models/user.model';
import { AppError } from '../middleware/error.middleware';
import { reshapeUserForApp } from '../utils/user.utils';
/**
 * Creates a Stripe Express Connected Account for a creator if one doesn't exist.
 * @param creatorId - The UUID of the creator.
 * @returns The Stripe Account ID (acct_...).
 */
export const getOrCreateStripeConnectedAccount = async (creatorId: string): Promise<string> => {
    // 2. Fetch the flat user data from the model.
    const flatUser = await UserModel.findUserById(creatorId);
    if (!flatUser) {
        throw new AppError('User not found while creating Stripe account.', 404);
    }
    // 3. Immediately reshape it into the application-standard format.
    const user = reshapeUserForApp(flatUser);

    if (user.role !== 'creator') {
        throw new AppError('User not found or is not a creator.', 404);
    }

    // If the account ID already exists, just return it.
    if (user.stripe_account_id) {
        return user.stripe_account_id;
    }

    // Create a new Stripe Express account for the creator.
    let account;
    try {
        account = await stripe.accounts.create({
            type: 'express',
            country: 'US', // Or dynamically set based on user's country
            email: user.email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            business_profile: {
                name: user.profile.name || user.username,
                product_description: 'Digital content and subscriptions on PoDM',
            },
        });
    } catch (error: any) {
        if (error.type === 'StripeInvalidRequestError' && error.message.includes('Connect')) {
            throw new AppError('Stripe Connect is not enabled on your platform account. Please go to your Stripe Dashboard -> Connect and complete the onboarding flow.', 400);
        }
        throw error;
    }

    // Save the new Stripe account ID to our database.
    await UserModel.updateProfile(creatorId, { stripe_account_id: account.id });

    return account.id;
};

/**
 * Creates a one-time onboarding link for a creator's Stripe Connected Account.
 * @param creatorId - The UUID of the creator.
 * @returns The URL for the Stripe onboarding session.
 */
export const createStripeAccountLink = async (creatorId: string): Promise<string> => {
    const accountId = await getOrCreateStripeConnectedAccount(creatorId);

    // These URLs tell Stripe where to send the user after they finish or leave onboarding.
    const returnUrl = `${process.env.CLIENT_URL}/hub/settings`;
    const refreshUrl = `${process.env.CLIENT_URL}/hub/settings`; // URL for if the link expires

    const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
    });

    return accountLink.url;
};