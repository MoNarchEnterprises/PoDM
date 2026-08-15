import supabase from '../config/supabaseClient';
import { AppError } from '../middleware/error.middleware';

export type CatalogPaymentType = 'Subscription' | 'PPV Post' | 'PPV Message' | 'Tip';

export interface CatalogPriceInput {
    creatorId: string;
    transactionType: CatalogPaymentType;
    relatedId?: string;
    amountInCents: number;
}

function requirePositiveCents(amountInCents: number): void {
    if (!Number.isSafeInteger(amountInCents) || amountInCents <= 0) {
        throw new AppError('Payment amount must be a positive whole number of cents.', 400);
    }
}

/**
 * Resolves the authoritative catalog amount for every priced payment path.
 * The client amount is compared to this result, never used as the source of
 * truth. Content ownership is checked here so a real content ID from another
 * creator cannot be paired with an arbitrary recipient.
 */
export async function assertCatalogPrice(input: CatalogPriceInput): Promise<number | null> {
    requirePositiveCents(input.amountInCents);

    if (input.transactionType === 'Tip') return null;
    if (!input.relatedId) {
        throw new AppError('A catalog identifier is required for this payment type.', 400);
    }

    if (input.transactionType === 'Subscription') {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('creator_data')
            .eq('id', input.creatorId)
            .single();

        if (error || !profile) {
            throw new AppError('Creator subscription catalog could not be found.', 404);
        }

        const tier = profile.creator_data?.subscriptionTiers?.find((candidate: any) => candidate?.id === input.relatedId);
        if (!tier || typeof tier.price !== 'number' || !Number.isFinite(tier.price) || tier.price <= 0) {
            throw new AppError('Selected subscription tier is invalid.', 400);
        }

        const expectedAmountInCents = Math.round(tier.price * 100);
        if (input.amountInCents !== expectedAmountInCents) {
            throw new AppError(
                `Payment amount ($${(input.amountInCents / 100).toFixed(2)}) does not match the catalog price ($${(expectedAmountInCents / 100).toFixed(2)}).`,
                400
            );
        }
        return expectedAmountInCents;
    }

    const { data: content, error } = await supabase
        .from('content')
        .select('id, creator_id, visibility, price')
        .eq('id', input.relatedId)
        .maybeSingle();

    if (error || !content || String(content.creator_id) !== String(input.creatorId) || content.visibility !== 'pay_per_view') {
        throw new AppError('Selected PPV content is invalid for this creator.', 400);
    }
    if (typeof content.price !== 'number' || !Number.isFinite(content.price) || content.price <= 0) {
        throw new AppError('Selected PPV content has no valid catalog price.', 400);
    }

    const expectedAmountInCents = Math.round(content.price * 100);
    if (input.amountInCents !== expectedAmountInCents) {
        throw new AppError(
            `Payment amount ($${(input.amountInCents / 100).toFixed(2)}) does not match the catalog price ($${(expectedAmountInCents / 100).toFixed(2)}).`,
            400
        );
    }
    return expectedAmountInCents;
}
