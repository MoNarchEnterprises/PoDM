import * as SubscriptionModel from '../models/subscription.model';
import * as UserModel from '../models/user.model';
import { AppError } from '../middleware/error.middleware';
import { Subscription } from '@common/types/Subscription';
import { User } from '@common/types/User';
import { reshapeUserForApp } from '../utils/user.utils';
import { reshapeSubscriptionForApp } from '../utils/subscription.utils';
import { SubscriptionTier } from '@common/types/Creator';
import * as TransactionModel from '../models/transaction.model';
import { DEFAULT_COMMISSION_RATE } from '../../lib/constants';
import supabase from '../config/supabaseClient';
import * as MessageService from './message.service';
import * as ContentModel from '../models/content.model';
import * as CryptoPaymentService from './cryptoPayment.service';

/**
 * Creates a new subscription for an authenticated fan using Web3 USDC payments.
 * @param fan_id - The ID of the fan who is subscribing.
 * @param creator_id - The ID of the creator being subscribed to.
 * @param tier_id - The internal ID of the subscription tier.
 * @param txHash - The Base blockchain transaction hash verifying the initial USDC payment.
 * @returns An object with the new subscription details.
 */
export const createSubscriptionForUser = async (
    fan_id: string,
    creator_id: string,
    tier_id: string,
    txHash: string
) => {
    // 1. Fetch creator and validate the selected tier
    const creator = await UserModel.findUserById(creator_id);
    if (!creator || !creator.creator_data?.subscriptionTiers) {
        throw new AppError('Creator or their subscription tiers not found.', 404);
    }

    const tier = creator.creator_data.subscriptionTiers.find((t: SubscriptionTier) => t.id === tier_id);
    if (!tier) {
        throw new AppError('Selected subscription tier is invalid.', 400);
    }

    // 2. Verify on-chain payment transfer and record transaction in local ledger
    const verification = await CryptoPaymentService.verifyAndRecordBasePayment({
        txHash: txHash,
        fanId: fan_id,
        creatorId: creator_id,
        amountInCents: Math.round(tier.price * 100),
        transactionType: 'Subscription',
        relatedId: tier_id
    });

    // 3. Save subscription to our database
    const dbSubscription = await SubscriptionModel.createSubscription({
        stripe_subscription_id: txHash, // Reuse stripe_subscription_id column to store blockchain transaction hash
        fan_id: fan_id,
        creator_id: creator_id,
        tier_id: tier_id,
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: undefined,
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (!dbSubscription) {
        throw new AppError('Failed to save subscription to database.', 500);
    }

    // 4. Send the welcome message if configured by creator
    try {
        const welcomeConfig = creator.creator_data.welcomeMessage;
        if (welcomeConfig && welcomeConfig.isActive && welcomeConfig.message) {
            let contentPayload = undefined;
            if (welcomeConfig.freeContentId) {
                const content = await ContentModel.findContentById(welcomeConfig.freeContentId);
                if (content && content.files && content.files.length > 0) {
                    contentPayload = {
                        contentId: content.id,
                        type: content.type,
                        thumbnailUrl: content.files[0].thumbnailUrl,
                        isPaid: false,
                        price: 0,
                        isUnlocked: true,
                    };
                }
            }
            await MessageService.sendDirectMessage(creator_id, fan_id, {
                text: welcomeConfig.message,
                content: contentPayload,
            });
        }
    } catch (welcomeError) {
        console.error(`[SubService] Failed to send welcome message:`, welcomeError);
    }

    return {
        requiresAction: false,
        subscription: dbSubscription
    };
};

/**
 * Retrieves all subscriptions for a given fan and enriches them with creator data.
 */
export const getFanSubscriptions = async (fan_id: string) => {
    const subscriptions = await SubscriptionModel.findSubscriptionsByFanId(fan_id);
    if (!subscriptions) {
        return [];
    }
    const shapedSubscriptions = await Promise.all(
        subscriptions.map(sub => reshapeSubscriptionForApp(sub))
    );
    return shapedSubscriptions.filter(sub => sub !== null);
};

/**
 * Retrieves all active subscribers for a given creator.
 */
export const getCreatorSubscribers = async (creator_id: string): Promise<(Subscription & { fan: User | null })[]> => {
    const subscriptions = await SubscriptionModel.findSubscriptionsByCreator(creator_id);
    if (!subscriptions || subscriptions.length === 0) return [];

    const subscriptionsWithFans = await Promise.all(subscriptions.map(async (sub) => {
        const fan = await UserModel.findUserById(sub.fan_id);
        return {
            ...sub,
            fan: fan ? reshapeUserForApp(fan) : null,
        };
    }));
    return subscriptionsWithFans;
};

/**
 * Cancels an active subscription for a fan.
 */
export const cancelFanSubscription = async (subscriptionId: string, fan_id: string) => {
    const numericSubscriptionId = parseInt(subscriptionId, 10);
    if (isNaN(numericSubscriptionId)) {
        throw new AppError('Invalid subscription ID format.', 400);
    }

    const subscription = await SubscriptionModel.findSubscriptionById(numericSubscriptionId);
    if (!subscription || subscription.fan_id !== fan_id) {
        throw new AppError('Subscription not found or does not belong to the fan.', 404);
    }
    if (subscription.status !== 'active') {
        throw new AppError('Only active subscriptions can be cancelled.', 400);
    }

    const updatedSubscription = await SubscriptionModel.updateSubscription(subscriptionId, {
        status: 'canceled',
        end_date: new Date().toISOString(),
    });

    if (!updatedSubscription) {
        throw new AppError('Failed to update subscription status in database.', 500);
    }

    return updatedSubscription;
};

/**
 * Changes the subscription tier for an active subscription.
 */
export const changeSubscriptionTier = async (subscriptionId: string, fan_id: string, newTierId: string) => {
    const numericSubscriptionId = parseInt(subscriptionId, 10);
    if (isNaN(numericSubscriptionId)) {
        throw new AppError('Invalid subscription ID format.', 400);
    }

    const subscription = await SubscriptionModel.findSubscriptionById(numericSubscriptionId);
    if (!subscription || subscription.fan_id !== fan_id) {
        throw new AppError('Subscription not found or you are not authorized to change it.', 404);
    }
    if (subscription.status !== 'active') {
        throw new AppError('Only active subscriptions can be changed.', 400);
    }

    const creator = await UserModel.findUserById(subscription.creator_id);
    if (!creator || !creator.creator_data?.subscriptionTiers) {
        throw new AppError('Creator or their subscription tiers not found.', 404);
    }
    const newTier = creator.creator_data.subscriptionTiers.find((t: any) => t.id === newTierId);
    if (!newTier) {
        throw new AppError('The selected new tier is invalid.', 400);
    }

    const updatedDbSubscription = await SubscriptionModel.updateSubscription(
        numericSubscriptionId.toString(),
        {
            tier_id: newTierId,
        }
    );

    if (!updatedDbSubscription) {
        throw new AppError('Failed to update subscription in our database.', 500);
    }

    return reshapeSubscriptionForApp(updatedDbSubscription);
};