import { Request, Response, NextFunction } from 'express';
import * as ContestService from '../services/contest.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';

export const create = asyncHandler(async (req: Request, res: Response) => {
    const contest = await ContestService.createContest(req.user!.id, req.body);
    created(res, contest);
});

export const getMyContests = asyncHandler(async (req: Request, res: Response) => {
    const contests = await ContestService.getCreatorContests(req.user!.id);
    ok(res, contests);
});

export const publish = asyncHandler(async (req: Request, res: Response) => {
    const contest = await ContestService.publishContest(req.params.id, req.user!.id);
    ok(res, contest);
});

export const finalize = asyncHandler(async (req: Request, res: Response) => {
    const winnerId = await ContestService.pickWinner(req.params.id, req.user!.id);
    ok(res, { winnerId });
});

export const enter = asyncHandler(async (req: Request, res: Response) => {
    const result = await ContestService.enterContest(req.params.id, req.user!.id);
    ok(res, result);
});

export const getFeed = asyncHandler(async (req: Request, res: Response) => {
    const contests = await ContestService.getFanContests();
    ok(res, contests);
});

export const getDetails = asyncHandler(async (req: Request, res: Response) => {
    const contest = await ContestService.getContestDetails(req.params.id, req.user?.id);
    ok(res, contest);
});
