import OpenAI from 'openai';
import { AppError } from '../middleware/error.middleware';
import * as SettingsModel from '../models/settings.model';

type AIProvider = 'openrouter' | 'nvidia' | 'openai';

interface ProviderConfig {
    baseURL: string;
    apiKey: string;
    model: string;
}

interface ProviderMeta {
    baseURL: string;
    defaultModel: string;
    getEnvKey: () => string | undefined;
    envKeyName: string;
}

const PROVIDER_CONFIGS: Record<AIProvider, ProviderMeta> = {
    openrouter: {
        baseURL: 'https://openrouter.ai/api/v1',
        defaultModel: 'google/gemma-3-27b-it:free',
        getEnvKey: () => process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY,
        envKeyName: 'AI_API_KEY (or OPENROUTER_API_KEY)',
    },
    nvidia: {
        baseURL: 'https://integrate.api.nvidia.com/v1',
        defaultModel: 'meta/llama-3.2-11b-vision-instruct',
        getEnvKey: () => process.env.NVIDIA_API_KEY,
        envKeyName: 'NVIDIA_API_KEY',
    },
    openai: {
        baseURL: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o-mini',
        getEnvKey: () => process.env.OPENAI_API_KEY,
        envKeyName: 'OPENAI_API_KEY',
    },
};

async function getProviderConfig(): Promise<ProviderConfig> {
    const dbProvider = await SettingsModel.getSetting('ai_provider');
    const provider: AIProvider = (dbProvider?.value as AIProvider) || 'openrouter';

    const config = PROVIDER_CONFIGS[provider];
    if (!config) {
        throw new AppError(`Unknown AI provider: ${provider}`, 500);
    }

    const apiKey = config.getEnvKey();
    if (!apiKey) {
        throw new AppError(`No API key configured for provider "${provider}". Please set ${config.envKeyName} in .env.`, 400);
    }

    const dbModel = await SettingsModel.getSetting('ai_model_id');
    const model = dbModel?.value || process.env.AI_MODEL_ID || config.defaultModel;

    return { baseURL: config.baseURL, apiKey, model };
}

/**
 * Generates a caption for an image or video using an AI Vision model.
 * @param imageUrl - The public URL or base64 data of the image/video to analyze.
 * @returns The generated caption.
 */
export const generateCaption = async (imageUrl: string): Promise<string> => {
    try {
        const { baseURL, apiKey, model } = await getProviderConfig();
        console.log(`[ai.service] Generating caption with model="${model}" at baseURL="${baseURL}"`);

        const client = new OpenAI({ apiKey, baseURL });

        const response = await client.chat.completions.create({
            model,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Write ONE witty, enticing caption for this image or video in English only. Do not use foreign characters. Do not provide options. Do not include introductory text like 'Here is a caption'. Just output the caption itself. Use wordplay or double meanings. Include 1-2 emojis and hashtags. Max 20 words." },
                        (imageUrl.startsWith('data:video')
                            ? {
                                type: "video_url",
                                video_url: {
                                    url: imageUrl,
                                }
                            }
                            : {
                                type: "image_url",
                                image_url: {
                                    url: imageUrl,
                                }
                            }
                        ) as any,
                    ],
                },
            ],
            max_tokens: 100,
        });

        return response.choices[0]?.message?.content || "Just posted! ✨ #newcontent";
    } catch (error: any) {
        console.error('Error generating caption:', error);
        const rawStatus = error.status || error.statusCode || 500;
        // Avoid mapping upstream AI provider 404 (e.g. model not found) to Express route 404
        const status = rawStatus === 404 ? 502 : rawStatus;
        const msg = rawStatus === 404 
            ? `AI Provider Error: Model or resource not found on provider (${error.message || '404 Not Found'})` 
            : (error.message || 'Failed to generate caption via AI service.');
        throw new AppError(msg, status);
    }
};
