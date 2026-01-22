/**
 * Storage Service
 * 
 * Abstraction layer for all file storage operations using Cloudflare R2.
 * This provides a consistent interface similar to Supabase Storage but using R2.
 */

import {
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectsCommand,
    HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import r2Client, { R2_BUCKETS, R2_PUBLIC_URL } from '../config/r2Client';

/**
 * Uploads a file to R2 private storage (for content, verification docs).
 * @param path - The file path within the bucket (e.g., "creator-id/filename.jpg")
 * @param buffer - The file data as a Buffer
 * @param contentType - The MIME type of the file
 * @param options - Additional options like cacheControl
 * @returns The relative path of the uploaded file
 */
export const uploadToPrivate = async (
    path: string,
    buffer: Buffer,
    contentType: string,
    options?: { cacheControl?: string }
): Promise<{ path: string; error: Error | null }> => {
    let lastError: Error | null = null;
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const command = new PutObjectCommand({
                Bucket: R2_BUCKETS.PRIVATE,
                Key: path,
                Body: buffer,
                ContentType: contentType,
                CacheControl: options?.cacheControl,
            });

            await r2Client.send(command);
            return { path, error: null };
        } catch (error) {
            console.warn(`[R2] Upload failed for ${path} (Attempt ${attempt}/${MAX_RETRIES}):`, error);
            lastError = error as Error;

            // Wait before retrying (exponential backoff: 500ms, 1000ms, 2000ms...)
            if (attempt < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
            }
        }
    }

    return { path: '', error: lastError };
};

/**
 * Uploads a file to R2 public storage (for avatars, banners).
 * @param path - The file path within the bucket
 * @param buffer - The file data as a Buffer
 * @param contentType - The MIME type of the file
 * @returns The public URL of the uploaded file
 */
export const uploadToPublic = async (
    path: string,
    buffer: Buffer,
    contentType: string
): Promise<{ publicUrl: string; error: Error | null }> => {
    try {
        const command = new PutObjectCommand({
            Bucket: R2_BUCKETS.PUBLIC,
            Key: path,
            Body: buffer,
            ContentType: contentType,
        });

        await r2Client.send(command);
        const publicUrl = `${R2_PUBLIC_URL}/${path}`;
        return { publicUrl, error: null };
    } catch (error) {
        console.error(`[R2] Failed to upload to public: ${path}`, error);
        return { publicUrl: '', error: error as Error };
    }
};

/**
 * Generates a temporary signed URL for accessing private content.
 * @param path - The file path within the private bucket
 * @param expiresIn - URL validity in seconds (default: 60)
 * @returns The signed URL
 */
export const getPrivateSignedUrl = async (
    path: string,
    expiresIn: number = 60
): Promise<{ signedUrl: string; error: Error | null }> => {
    try {
        const command = new GetObjectCommand({
            Bucket: R2_BUCKETS.PRIVATE,
            Key: path,
        });

        const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
        return { signedUrl, error: null };
    } catch (error) {
        console.error(`[R2] Failed to generate signed URL: ${path}`, error);
        return { signedUrl: '', error: error as Error };
    }
};

/**
 * Downloads a file from private storage.
 * Used for operations like watermarking where we need to process the file.
 * @param path - The file path within the private bucket
 * @returns The file as a Buffer
 */
export const downloadFromPrivate = async (
    path: string
): Promise<{ buffer: Buffer | null; error: Error | null }> => {
    try {
        const command = new GetObjectCommand({
            Bucket: R2_BUCKETS.PRIVATE,
            Key: path,
        });

        const response = await r2Client.send(command);

        if (!response.Body) {
            throw new Error('No body in response');
        }

        // Convert stream to buffer
        const chunks: Uint8Array[] = [];
        for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        return { buffer, error: null };
    } catch (error) {
        console.error(`[R2] Failed to download: ${path}`, error);
        return { buffer: null, error: error as Error };
    }
};

/**
 * Deletes multiple files from private storage.
 * @param paths - Array of file paths to delete
 * @returns Success status and any error
 */
export const deleteFromPrivate = async (
    paths: string[]
): Promise<{ success: boolean; error: Error | null }> => {
    if (paths.length === 0) {
        return { success: true, error: null };
    }

    try {
        const command = new DeleteObjectsCommand({
            Bucket: R2_BUCKETS.PRIVATE,
            Delete: {
                Objects: paths.map(path => ({ Key: path })),
            },
        });

        await r2Client.send(command);
        return { success: true, error: null };
    } catch (error) {
        console.error(`[R2] Failed to delete files`, error);
        return { success: false, error: error as Error };
    }
};

/**
 * Gets the public URL for a file in the public bucket.
 * @param path - The file path within the public bucket
 * @returns The full public URL
 */
export const getPublicUrl = (path: string): string => {
    return `${R2_PUBLIC_URL}/${path}`;
};

/**
 * Checks if a file exists in private storage.
 * @param path - The file path to check
 * @returns True if file exists
 */
export const existsInPrivate = async (path: string): Promise<boolean> => {
    try {
        const command = new HeadObjectCommand({
            Bucket: R2_BUCKETS.PRIVATE,
            Key: path,
        });
        await r2Client.send(command);
        return true;
    } catch {
        return false;
    }
};
