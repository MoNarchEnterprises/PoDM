
import stripe from '../config/stripeClient'; // <-- ADD THIS LINE
import * as UserModel from '../models/user.model';
import { AppError } from '../middleware/error.middleware';

export const createStripeConnectedAccount = async (userId: string): Promise<string> => {
    const user = await UserModel.findUserById(userId);
    if (!user || user.role !== 'creator') {
        throw new AppError('User not found or is not a creator.', 404);
    }
    if (user.stripe_account_id) {
        return user.stripe_account_id; // Already has an account
    }
    const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email,
        capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
        },
        business_profile: {
            name: user.profile.name || 'Creator on PoDM',
            product_description: 'Content creation and subscriptions',
        },
    });
    await UserModel.updateProfile(userId, { stripe_account_id: account.id });
    return account.id;
};