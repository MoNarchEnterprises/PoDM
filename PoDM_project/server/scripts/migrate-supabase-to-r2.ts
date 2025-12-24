/**
 * Migration Script: Supabase Storage → Cloudflare R2
 * 
 * This script migrates all content files (images, videos, thumbnails) 
 * from Supabase Storage to Cloudflare R2.
 * 
 * Uses dynamic imports to ensure environment variables are loaded first.
 * 
 * Usage:
 * npx tsx server/scripts/migrate-supabase-to-r2.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// 1. Load environment variables IMMEDIATELY
const rootEnv = path.resolve(__dirname, '../../.env');
const serverEnv = path.resolve(__dirname, '../.env');

dotenv.config({ path: rootEnv });
dotenv.config({ path: serverEnv });

console.log('--- DEBUG: Environment Variables ---');
console.log(`Loading .env from: ${rootEnv} and ${serverEnv}`);
console.log('R2_ACCOUNT_ID:', process.env.R2_ACCOUNT_ID ? 'Set' : 'MISSING');
console.log('R2_ACCESS_KEY_ID:', process.env.R2_ACCESS_KEY_ID ? 'Set' : 'MISSING');
console.log('R2_SECRET_ACCESS_KEY:', process.env.R2_SECRET_ACCESS_KEY ? 'Set' : 'MISSING');
console.log('------------------------------------');

// 2. Import external dependencies that don't depend on env vars for initialization
import { createClient } from '@supabase/supabase-js';

// Types
interface MigrationStats {
    totalFiles: number;
    successfulMigrations: number;
    failedMigrations: number;
    skippedFiles: number;
    errors: Array<{ file: string; error: string }>;
}

async function main() {
    // 3. Dynamically import StorageService NOW, after env vars are loaded
    const StorageServiceModule = await import('../services/storage.service');
    const StorageService = StorageServiceModule.default || StorageServiceModule;

    // 4. Setup Supabase
    const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
        process.exit(1);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Helper functions
    async function downloadFromSupabase(bucketName: string, filePath: string): Promise<Buffer | null> {
        try {
            const { data, error } = await supabaseAdmin.storage
                .from(bucketName)
                .download(filePath);

            if (error) {
                console.error(`   ❌ Supabase download error for ${filePath}:`, error.message);
                return null;
            }

            if (!data) {
                console.error(`   ❌ No data returned for ${filePath}`);
                return null;
            }

            const arrayBuffer = await data.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (error: any) {
            console.error(`   ❌ Exception downloading ${filePath}:`, error.message);
            return null;
        }
    }

    async function migrateFile(
        supabaseBucket: string,
        supabasePath: string,
        r2Path: string,
        contentType: string,
        stats: MigrationStats
    ): Promise<boolean> {
        try {
            const exists = await StorageService.existsInPrivate(r2Path);
            if (exists) {
                console.log(`   ⏭️  Already exists in R2: ${r2Path}`);
                stats.skippedFiles++;
                return true;
            }

            console.log(`   📥 Downloading from Supabase: ${supabasePath}`);
            const buffer = await downloadFromSupabase(supabaseBucket, supabasePath);

            if (!buffer) {
                stats.failedMigrations++;
                stats.errors.push({
                    file: supabasePath,
                    error: 'Failed to download from Supabase'
                });
                return false;
            }

            console.log(`   📤 Uploading to R2: ${r2Path}`);
            const { error } = await StorageService.uploadToPrivate(r2Path, buffer, contentType);

            if (error) {
                console.error(`   ❌ R2 upload failed:`, error.message);
                stats.failedMigrations++;
                stats.errors.push({
                    file: supabasePath,
                    error: `R2 upload failed: ${error.message}`
                });
                return false;
            }

            stats.successfulMigrations++;
            console.log(`   ✅ Successfully migrated: ${r2Path}`);
            return true;
        } catch (error: any) {
            console.error(`   ❌ Migration failed:`, error.message);
            stats.failedMigrations++;
            stats.errors.push({
                file: supabasePath,
                error: error.message
            });
            return false;
        }
    }

    // Main Migration Logic
    console.log('🚀 Starting Supabase → R2 Migration for ALL Content\n');

    const stats: MigrationStats = {
        totalFiles: 0,
        successfulMigrations: 0,
        failedMigrations: 0,
        skippedFiles: 0,
        errors: []
    };

    try {
        console.log('📊 Fetching all content from database...');
        const { data: contentList, error: dbError } = await supabase
            .from('content')
            .select('id, creator_id, files, type');

        if (dbError) {
            console.error('❌ Database error:', dbError);
            process.exit(1);
        }

        if (!contentList || contentList.length === 0) {
            console.log('ℹ️  No content found in database');
            return;
        }

        console.log(`📦 Found ${contentList.length} content items\n`);

        for (let i = 0; i < contentList.length; i++) {
            const content = contentList[i];
            console.log(`\n[${i + 1}/${contentList.length}] Processing Content ID: ${content.id}`);
            console.log(`   Creator: ${content.creator_id}`);

            if (!content.files || !Array.isArray(content.files)) {
                console.log('   ⚠️  No files array found, skipping');
                continue;
            }

            for (const file of content.files) {
                stats.totalFiles++;

                const fileId = file.id;
                // Important: Ensure fileId is valid
                if (!fileId || fileId === 'undefined') {
                    console.log(`   ⚠️  Invalid file ID: ${fileId}, skipping`);
                    continue;
                }

                const mimeType = file.mimeType || 'application/octet-stream';
                const supabaseBucket = 'creator-content';

                const supabaseMainPath = `${content.creator_id}/${fileId}`;
                const supabaseThumbnailPath = `${content.creator_id}/thumb-${fileId}.webp`;
                const r2MainPath = `${content.creator_id}/${fileId}`;
                const r2ThumbnailPath = `${content.creator_id}/thumb-${fileId}.webp`;

                // Migrate main file
                console.log(`\n   📄 File: ${fileId}`);
                await migrateFile(
                    supabaseBucket,
                    supabaseMainPath,
                    r2MainPath,
                    mimeType,
                    stats
                );

                // Migrate thumbnail
                console.log(`\n   🖼️  Thumbnail: thumb-${fileId}.webp`);
                await migrateFile(
                    supabaseBucket,
                    supabaseThumbnailPath,
                    r2ThumbnailPath,
                    'image/webp',
                    stats
                );

                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 MIGRATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total files processed:     ${stats.totalFiles}`);
        console.log(`✅ Successful migrations:   ${stats.successfulMigrations}`);
        console.log(`⏭️  Skipped (already exist): ${stats.skippedFiles}`);
        console.log(`❌ Failed migrations:       ${stats.failedMigrations}`);
        console.log('='.repeat(60));

        if (stats.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            stats.errors.forEach((err, index) => {
                console.log(`${index + 1}. ${err.file}`);
                console.log(`   Error: ${err.error}`);
            });
        }

        if (stats.failedMigrations === 0) {
            console.log('\n🎉 Migration completed successfully!');
        } else {
            console.log('\n⚠️  Migration completed with some errors.');
        }

    } catch (error: any) {
        console.error('\n💥 Fatal error during migration:', error);
        process.exit(1);
    }
}

main().catch(console.error);
