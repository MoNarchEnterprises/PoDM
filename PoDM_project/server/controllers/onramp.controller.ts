import { Request, Response } from 'express';
import { onRampService } from '../services/onramp.service';
import { asyncHandler } from '../utils/asyncHandler';

export const createOnRampSession = asyncHandler(async (req: Request, res: Response) => {
    const { amount, destinationWallet, signature, message } = req.body;
    const fanId = req.user?.id;

    if (!fanId) {
        res.status(401).json({ success: false, message: 'Authentication required.' });
        return;
    }

    if (!amount || amount <= 0) {
        res.status(400).json({ success: false, message: 'A valid amount is required.' });
        return;
    }

    const session = await onRampService.createCharge(amount, fanId, destinationWallet, signature, message);

    res.status(201).json({
        success: true,
        data: session,
    });
});

export const handleOnRampWebhook = asyncHandler(async (req: Request, res: Response) => {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-coinbase-signature'] as string | undefined;

    await onRampService.handleWebhook(rawBody, signature);

    res.status(200).json({ success: true });
});
