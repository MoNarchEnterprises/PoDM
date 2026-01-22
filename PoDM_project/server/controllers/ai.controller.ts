import { Request, Response, NextFunction } from 'express';
import * as AIService from '../services/ai.service';
import { AppError } from '../middleware/error.middleware';

/**
 * Generates a caption for an uploaded image or video.
 * Expects { imageUrl: string } in the body or a file upload.
 */
export const generateCaption = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Handle file upload (Base64 conversion)
        const file = req.file;
        let imageUrl = req.body.imageUrl;

        if (file) {
            // Convert buffer to Base64 data URI
            const b64 = file.buffer.toString('base64');
            const mimeType = file.mimetype;
            // Simply pass the data URI. The Service will handle how to send it to the AI.
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
    } catch (error) {
        next(error);
    }
};
