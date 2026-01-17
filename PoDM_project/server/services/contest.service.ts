import * as ContestModel from '../models/contest.model';
import { AppError } from '../middleware/error.middleware';
import * as SubscriptionModel from '../models/subscription.model';

export const createContest = async (creatorId: string, data: any) => {
    if (!data.title || !data.start_date || !data.end_date) {
        throw new AppError('Missing required fields', 400);
    }

    if (new Date(data.end_date) <= new Date(data.start_date)) {
        throw new AppError('End date must be after start date', 400);
    }

    return await ContestModel.createContest({
        ...data,
        creator_id: creatorId,
        status: 'draft' // Default to draft, or active if specified? let's strictly validate later
    });
};

export const publishContest = async (contestId: string, creatorId: string) => {
    const contest = await ContestModel.getContestById(contestId);
    if (!contest) throw new AppError('Contest not found', 404);
    if (contest.creator_id !== creatorId) throw new AppError('Unauthorized', 403);

    return await ContestModel.updateContest(contestId, { status: 'active' });
};

export const getCreatorContests = async (creatorId: string) => {
    return await ContestModel.getContestsByCreator(creatorId);
};

export const enterContest = async (contestId: string, fanId: string) => {
    const contest = await ContestModel.getContestById(contestId);
    if (!contest) throw new AppError('Contest not found', 404);

    if (contest.status !== 'active') {
        throw new AppError('Contest is not active', 400);
    }

    if (new Date() > new Date(contest.end_date)) {
        throw new AppError('Contest has ended', 400);
    }

    // Check Requirements
    if (contest.entry_requirements?.tier_id || contest.entry_requirements?.all_subscribers) {
        // Simplify: just check if they have ANY active subscription to this creator
        const subs = await SubscriptionModel.findActiveSubscriptionsByFan(fanId);
        const isSubscribed = subs?.some(s => s.creator_id === contest.creator_id);

        if (!isSubscribed) {
            throw new AppError('You must be a subscriber to enter this contest.', 403);
        }
    }

    return await ContestModel.createEntry(contestId, fanId);
};

export const pickWinner = async (contestId: string, creatorId: string) => {
    const contest = await ContestModel.getContestById(contestId);
    if (!contest) throw new AppError('Contest not found', 404);
    if (contest.creator_id !== creatorId) throw new AppError('Unauthorized', 403);

    if (contest.status === 'completed') throw new AppError('Contest already completed', 400);

    return await ContestModel.pickWinner(contestId);
};

export const getFanContests = async () => {
    return await ContestModel.getActiveContestsForFan();
};

export const getContestDetails = async (contestId: string, userId?: string) => {
    const contest = await ContestModel.getContestById(contestId);
    if (!contest) throw new AppError('Contest not found', 404);

    let hasEntered = false;
    if (userId) {
        hasEntered = await ContestModel.hasUserEntered(contestId, userId);
    }

    return { ...contest, hasEntered };
};
