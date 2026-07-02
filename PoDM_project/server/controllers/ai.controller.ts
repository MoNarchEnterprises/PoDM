import { Request, Response, NextFunction } from 'express';
import * as AIService from '../services/ai.service';
import { AppError } from '../middleware/error.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const generateCaption = asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    let imageUrl = req.body.imageUrl;

    if (file) {
        const b64 = file.buffer.toString('base64');
        const mimeType = file.mimetype;
        imageUrl = `data:${mimeType};base64,${b64}`;
    }

    if (!imageUrl) {
        throw new AppError('Image/Video file or URL is required.', 400);
    }

    const caption = await AIService.generateCaption(imageUrl);

    res.status(200).json({
        status: 'success',
        data: {
            caption,
        },
    });
});
