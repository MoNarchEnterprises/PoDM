import { Request, Response, NextFunction } from 'express';
import * as ContestService from '../services/contest.service';

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contest = await ContestService.createContest(req.user!.id, req.body);
        res.status(201).json({ success: true, data: contest });
    } catch (error) {
        next(error);
    }
};

export const getMyContests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contests = await ContestService.getCreatorContests(req.user!.id);
        res.status(200).json({ success: true, data: contests });
    } catch (error) {
        next(error);
    }
};

export const publish = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contest = await ContestService.publishContest(req.params.id, req.user!.id);
        res.status(200).json({ success: true, data: contest });
    } catch (error) {
        next(error);
    }
};

export const finalize = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const winnerId = await ContestService.pickWinner(req.params.id, req.user!.id);
        res.status(200).json({ success: true, data: { winnerId } });
    } catch (error) {
        next(error);
    }
};

export const enter = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ContestService.enterContest(req.params.id, req.user!.id);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const getFeed = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contests = await ContestService.getFanContests();
        res.status(200).json({ success: true, data: contests });
    } catch (error) {
        next(error);
    }
};

export const getDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contest = await ContestService.getContestDetails(req.params.id, req.user?.id);
        res.status(200).json({ success: true, data: contest });
    } catch (error) {
        next(error);
    }
};
