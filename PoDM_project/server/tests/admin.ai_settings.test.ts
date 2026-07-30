import * as AdminService from '../services/admin.service';
import * as AIService from '../services/ai.service';
import * as SettingsModel from '../models/settings.model';

jest.mock('../models/settings.model');

describe('Admin AI Model Selection Settings', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getPlatformSettings', () => {
        it('should return aiModelId from SettingsModel if present', async () => {
            (SettingsModel.getSetting as jest.Mock).mockImplementation(async (key: string) => {
                if (key === 'platform_commission_rate') return { key, value: 15 };
                if (key === 'ai_model_id') return { key, value: 'openai/gpt-4o' };
                return null;
            });

            const settings = await AdminService.getPlatformSettings();
            expect(settings.commissionRate).toBe(15);
            expect(settings.aiModelId).toBe('openai/gpt-4o');
        });

        it('should fallback to process.env.AI_MODEL_ID or default if not set in DB', async () => {
            (SettingsModel.getSetting as jest.Mock).mockResolvedValue(null);

            const settings = await AdminService.getPlatformSettings();
            expect(settings.aiModelId).toBe(process.env.AI_MODEL_ID || 'google/gemma-3-27b-it:free');
        });
    });

    describe('updatePlatformSettings', () => {
        it('should update ai_model_id when aiModelId is passed', async () => {
            (SettingsModel.updateSetting as jest.Mock).mockResolvedValue({ key: 'ai_model_id', value: 'anthropic/claude-3-opus' });

            const result = await AdminService.updatePlatformSettings({ aiModelId: 'anthropic/claude-3-opus' });
            expect(SettingsModel.updateSetting).toHaveBeenCalledWith('ai_model_id', 'anthropic/claude-3-opus');
            expect(result.success).toBe(true);
        });

        it('should throw AppError if aiModelId is empty or not string', async () => {
            await expect(AdminService.updatePlatformSettings({ aiModelId: '  ' })).rejects.toThrow('AI model ID must be a non-empty string.');
        });
    });
});
