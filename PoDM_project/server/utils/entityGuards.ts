import { AppError } from '../middleware/error.middleware';
import * as UserModel from '../models/user.model';
import * as ContentModel from '../models/content.model';
import { User } from '@common/types/User';
import { Content } from '@common/types/Content';

export const requireUser = async (userId: string): Promise<User> => {
    const user = await UserModel.findUserById(userId);
    if (!user) {
        throw new AppError('User not found.', 404);
    }
    return user;
};

export const requireContent = async (contentId: string): Promise<Content> => {
    const content = await ContentModel.findContentById(contentId);
    if (!content) {
        throw new AppError('Content not found.', 404);
    }
    return content;
};

export const requireContentOwnership = async (contentId: string, userId: string): Promise<Content> => {
    const content = await requireContent(contentId);
    if (content.creator_id !== userId) {
        throw new AppError('You are not authorized to modify this content.', 403);
    }
    return content;
};
