/**
 * Verification Script: Check R2 and Supabase Storage Status
 * 
 * This script checks which content files exist in:
 * - Database (what files should exist)
 * - Cloudflare R2 (current storage)
 * - Supabase Storage (old storage)
 * 
 * Usage:
 * npx tsx server/scripts/verify-storage.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { createClient } from '@supabase/supabase-js';
import * as StorageService from '../services/storage.service';

// Get supabase instance from environment
const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface FileStatus {
    contentId: string;
    fileId: string;
    creatorId: string;
    type: string;
    inDatabase: boolean;
    inR2: boolean;
    inSupabase: boolean;
    r2Path: string;
    supabasePath: string;
}

/**
 * Check if file exists in Supabase Storage
 */
async function checkSupabaseFile(bucketName: string, filePath: string): Promise<boolean> {
    try {
        const { data, error } = await supabase.storage
            .from(bucketName)
            .list(path.dirname(filePath), {
                search: path.basename(filePath),
                limit: 1
            });

        if (error) {
            return false;
        }

        return data && data.length > 0;
    } catch (error) {
        return false;
    }
}

/**
 * Main verification function
 */
async function verifyStorage() {
    console.log('🔍 Starting Storage Verification\n');
    console.log('='.repeat(80));

    const fileStatuses: FileStatus[] = [];
    let totalFiles = 0;
    let inR2Count = 0;
    let inSupabaseCount = 0;
    let missingCount = 0;

    try {
        // Fetch all content from database
        console.log('📊 Fetching all content from database...\n');
        const { data: contentList, error: dbError } = await supabase
            .from('content')
            .select('id, creator_id, files, type, title');

        if (dbError) {
            console.error('❌ Database error:', dbError);
            process.exit(1);
        }

        if (!contentList || contentList.length === 0) {
            console.log('ℹ️  No content found in database');
            return;
        }

        console.log(`📦 Found ${contentList.length} content items\n`);
        console.log('='.repeat(80));

        // Check each content item
        for (let i = 0; i < contentList.length; i++) {
            const content = contentList[i];

            if (!content.files || !Array.isArray(content.files) || content.files.length === 0) {
                continue;
            }

            for (const file of content.files) {
                totalFiles++;

                const fileId = file.id;
                const r2MainPath = `${content.creator_id}/${fileId}`;
                const r2ThumbnailPath = `${content.creator_id}/thumb-${fileId}.webp`;
                const supabaseMainPath = r2MainPath;
                const supabaseThumbnailPath = r2ThumbnailPath;

                // Check main file in R2
                const mainInR2 = await StorageService.existsInPrivate(r2MainPath);

                // Check thumbnail in R2
                const thumbInR2 = await StorageService.existsInPrivate(r2ThumbnailPath);

                // Check in Supabase
                const mainInSupabase = await checkSupabaseFile('content', supabaseMainPath);
                const thumbInSupabase = await checkSupabaseFile('content', supabaseThumbnailPath);

                const status: FileStatus = {
                    contentId: content.id,
                    fileId,
                    creatorId: content.creator_id,
                    type: content.type,
                    inDatabase: true,
                    inR2: mainInR2 && thumbInR2,
                    inSupabase: mainInSupabase && thumbInSupabase,
                    r2Path: r2MainPath,
                    supabasePath: supabaseMainPath
                };

                fileStatuses.push(status);

                if (status.inR2) inR2Count++;
                if (status.inSupabase) inSupabaseCount++;
                if (!status.inR2 && !status.inSupabase) missingCount++;

                // Display status
                const r2Status = mainInR2 ? '✅ R2' : '❌ R2';
                const thumbR2Status = thumbInR2 ? '✅ Thumb' : '❌ Thumb';
                const supabaseStatus = mainInSupabase ? '✅ Supabase' : '❌ Supabase';

                console.log(`\n[${i + 1}/${contentList.length}] Content: ${content.title} (ID: ${content.id})`);
                console.log(`   File: ${fileId}`);
                console.log(`   Status: ${r2Status} | ${thumbR2Status} | ${supabaseStatus}`);

                if (!mainInR2 && mainInSupabase) {
                    console.log(`   ⚠️  Available in Supabase, needs migration`);
                } else if (!mainInR2 && !mainInSupabase) {
                    console.log(`   🚨 MISSING from both storages!`);
                }
            }
        }

        // Print summary
        console.log('\n' + '='.repeat(80));
        console.log('📊 VERIFICATION SUMMARY');
        console.log('='.repeat(80));
        console.log(`Total files in database:        ${totalFiles}`);
        console.log(`✅ Complete in R2:              ${inR2Count} (${((inR2Count / totalFiles) * 100).toFixed(1)}%)`);
        console.log(`📦 Still in Supabase:           ${inSupabaseCount} (${((inSupabaseCount / totalFiles) * 100).toFixed(1)}%)`);
        console.log(`🚨 Missing from both:           ${missingCount} (${((missingCount / totalFiles) * 100).toFixed(1)}%)`);
        console.log(`📋 Need migration:              ${fileStatuses.filter(f => !f.inR2 && f.inSupabase).length}`);
        console.log('='.repeat(80));

        // Show files that need migration
        const needMigration = fileStatuses.filter(f => !f.inR2 && f.inSupabase);
        if (needMigration.length > 0) {
            console.log('\n📋 FILES THAT NEED MIGRATION FROM SUPABASE TO R2:');
            needMigration.forEach((file, index) => {
                console.log(`${index + 1}. Content ${file.contentId} - ${file.r2Path}`);
            });
        }

        // Show missing files
        const missing = fileStatuses.filter(f => !f.inR2 && !f.inSupabase);
        if (missing.length > 0) {
            console.log('\n🚨 FILES MISSING FROM BOTH STORAGES:');
            missing.forEach((file, index) => {
                console.log(`${index + 1}. Content ${file.contentId} - ${file.r2Path}`);
            });
        }

    } catch (error: any) {
        console.error('\n💥 Fatal error during verification:', error);
        process.exit(1);
    }
}

// Run verification
verifyStorage()
    .then(() => {
        console.log('\n✅ Verification complete');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Verification failed:', error);
        process.exit(1);
    });
