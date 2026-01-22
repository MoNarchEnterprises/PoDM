import OpenAI from 'openai';
import { AppError } from '../middleware/error.middleware';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.AI_API_KEY;
// Check if it's an OpenRouter key to set the base URL
const baseURL = apiKey?.startsWith('sk-or-v1')
    ? 'https://openrouter.ai/api/v1'
    : undefined;

const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
});

/**
 * Generates a caption for an image using an AI Vision model.
 * @param imageUrl - The public URL of the image to analyze.
 * @returns The generated caption.
 */
export const generateCaption = async (imageUrl: string): Promise<string> => {
    if (!apiKey) {
        console.warn('AI_API_KEY is missing. Returning mock caption.');
        return "Enjoying the moment! ✨ #vibes (AI Key Missing)";
    }

    try {
        const model = process.env.AI_MODEL_ID || "google/gemma-3-27b-it:free";
        console.log('Using model:', model);
        const response = await openai.chat.completions.create({
            // Use environment variable if set, otherwise default to the requested Gemma 3 model
            model: model,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Write ONE witty, enticing caption for this image or video in English only. Do not use foreign characters. Do not provide options. Do not include introductory text like 'Here is a caption'. Just output the caption itself. Use wordplay or double meanings. Include 1-2 emojis and hashtags. Max 20 words." },
                        // Dynamically determine if it's an image or video
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
                        ) as any, // Cast to any because standard OpenAI types might not support video_url yet
                    ],
                },
            ],
            max_tokens: 100,
        });

        return response.choices[0]?.message?.content || "Just posted! ✨ #newcontent";
    } catch (error: any) {
        console.error('Error generating caption:', error);
        // Pass through the status code if it exists (e.g., 429)
        const status = error.status || error.statusCode || 500;
        throw new AppError(error.message || 'Failed to generate caption via AI service.', status);
    }
};
