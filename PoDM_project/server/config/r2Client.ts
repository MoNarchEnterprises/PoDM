/**
 * Cloudflare R2 Client Configuration
 * 
 * R2 uses the S3-compatible API, so we can use the AWS SDK.
 * This module provides a configured S3 client pointing to Cloudflare R2.
 */

import { S3Client } from '@aws-sdk/client-s3';

// R2 Configuration from environment variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.warn('[R2] Missing R2 credentials. File storage will not work.');
}

/**
 * S3-compatible client configured for Cloudflare R2.
 * The endpoint uses the account-specific R2 URL format.
 */
const r2Client = new S3Client({
    region: 'auto', // R2 doesn't use regions, but SDK requires this
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || '',
        secretAccessKey: R2_SECRET_ACCESS_KEY || '',
    },
});

// Bucket names - these map to the Supabase buckets
export const R2_BUCKETS = {
    // Private bucket for content that requires signed URLs
    PRIVATE: process.env.R2_BUCKET_PRIVATE || 'podm-private',
    // Public bucket for avatars, banners, etc.
    PUBLIC: process.env.R2_BUCKET_PUBLIC || 'podm-public',
} as const;

// Public URL base for the public bucket (set up in R2 dashboard)
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

export default r2Client;
