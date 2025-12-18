/**
 * R2 Migration Script
 * 
 * This script migrates existing files from Supabase Storage to Cloudflare R2.
 * Run with: npx ts-node scripts/migrate-to-r2.ts
 * 
 * IMPORTANT: Run this script BEFORE deploying the R2 code changes to production.
 */

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ===== CONFIGURATION =====
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_PRIVATE = process.env.R2_BUCKET_PRIVATE || 'podm-private';
const R2_BUCKET_PUBLIC = process.env.R2_BUCKET_PUBLIC || 'podm-public';

// Mapping of Supabase buckets to R2 buckets
const BUCKET_MAPPING: Record<string, { r2Bucket: string; isPublic: boolean }> = {
    'creator-content': { r2Bucket: R2_BUCKET_PRIVATE, isPublic: false },
    'verification-documents': { r2Bucket: R2_BUCKET_PRIVATE, isPublic: false },
    'avatars': { r2Bucket: R2_BUCKET_PUBLIC, isPublic: true },
    'banners': { r2Bucket: R2_BUCKET_PUBLIC, isPublic: true },
};

// ===== CLIENTS =====
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

// ===== MIGRATION FUNCTIONS =====

interface MigrationResult {
    success: boolean;
    path: string;
    error?: string;
}

async function fileExistsInR2(bucket: string, key: string): Promise<boolean> {
    try {
        await r2Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return true;
    } catch {
        return false;
    }
}

async function migrateFile(
    supabaseBucket: string,
    filePath: string,
    r2Bucket: string
): Promise<MigrationResult> {
    try {
        // Check if already migrated
        if (await fileExistsInR2(r2Bucket, filePath)) {
            console.log(`  ⏭️  Skipping (already exists): ${filePath}`);
            return { success: true, path: filePath };
        }

        // Download from Supabase
        const { data: fileData, error: downloadError } = await supabase.storage
            .from(supabaseBucket)
            .download(filePath);

        if (downloadError || !fileData) {
            throw new Error(`Download failed: ${downloadError?.message}`);
        }

        // Convert Blob to Buffer
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to R2
        const putCommand = new PutObjectCommand({
            Bucket: r2Bucket,
            Key: filePath,
            Body: buffer,
            ContentType: fileData.type || 'application/octet-stream',
        });

        await r2Client.send(putCommand);

        console.log(`  ✅ Migrated: ${filePath}`);
        return { success: true, path: filePath };

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`  ❌ Failed: ${filePath} - ${errorMsg}`);
        return { success: false, path: filePath, error: errorMsg };
    }
}

async function listAllFilesInBucket(bucketName: string): Promise<string[]> {
    const files: string[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
        const { data, error } = await supabase.storage
            .from(bucketName)
            .list('', { limit, offset });

        if (error) {
            console.error(`Error listing files in ${bucketName}:`, error);
            break;
        }

        if (!data || data.length === 0) break;

        // Handle nested folders
        for (const item of data) {
            if (item.id) {
                // It's a file
                files.push(item.name);
            } else {
                // It's a folder, recursively list
                const folderFiles = await listFilesInFolder(bucketName, item.name);
                files.push(...folderFiles);
            }
        }

        if (data.length < limit) break;
        offset += limit;
    }

    return files;
}

async function listFilesInFolder(bucketName: string, folderPath: string): Promise<string[]> {
    const files: string[] = [];
    const { data, error } = await supabase.storage
        .from(bucketName)
        .list(folderPath, { limit: 1000 });

    if (error || !data) return files;

    for (const item of data) {
        const fullPath = `${folderPath}/${item.name}`;
        if (item.id) {
            files.push(fullPath);
        } else {
            const nestedFiles = await listFilesInFolder(bucketName, fullPath);
            files.push(...nestedFiles);
        }
    }

    return files;
}

async function migrateBucket(supabaseBucket: string): Promise<void> {
    const mapping = BUCKET_MAPPING[supabaseBucket];
    if (!mapping) {
        console.log(`⚠️  No R2 mapping for bucket: ${supabaseBucket}`);
        return;
    }

    console.log(`\n📦 Migrating bucket: ${supabaseBucket} → ${mapping.r2Bucket}`);

    const files = await listAllFilesInBucket(supabaseBucket);
    console.log(`   Found ${files.length} files`);

    const results: MigrationResult[] = [];

    for (const filePath of files) {
        const result = await migrateFile(supabaseBucket, filePath, mapping.r2Bucket);
        results.push(result);
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`   ✅ Succeeded: ${succeeded} | ❌ Failed: ${failed}`);
}

// ===== MAIN =====

async function main() {
    console.log('🚀 Starting Supabase → R2 Migration\n');
    console.log('Configuration:');
    console.log(`   Supabase URL: ${SUPABASE_URL}`);
    console.log(`   R2 Account: ${R2_ACCOUNT_ID}`);
    console.log(`   R2 Private Bucket: ${R2_BUCKET_PRIVATE}`);
    console.log(`   R2 Public Bucket: ${R2_BUCKET_PUBLIC}`);

    // Validate credentials
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('❌ Missing Supabase credentials');
        process.exit(1);
    }
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
        console.error('❌ Missing R2 credentials');
        process.exit(1);
    }

    // Migrate each bucket
    for (const bucket of Object.keys(BUCKET_MAPPING)) {
        await migrateBucket(bucket);
    }

    console.log('\n✅ Migration complete!\n');
    console.log('Next steps:');
    console.log('1. Verify files appear in R2 dashboard');
    console.log('2. Update your .env with R2 credentials');
    console.log('3. Deploy the updated backend code');
    console.log('4. Test file uploads and downloads');
}

main().catch(console.error);
