/**
 * Missing Files Report Generator
 * 
 * Creates a detailed JSON report of which content files are missing,
 * exist in Supabase, or exist in R2.
 * 
 * Uses dynamic imports to ensure environment variables are loaded first.
 * 
 * Usage:
 * npx tsx server/scripts/generate-missing-files-report.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// 1. Load environment variables IMMEDIATELY
const rootEnv = path.resolve(__dirname, '../../.env');
const serverEnv = path.resolve(__dirname, '../.env');

dotenv.config({ path: rootEnv });
dotenv.config({ path: serverEnv });

import { createClient } from '@supabase/supabase-js';

// Types
interface FileReport {
    contentId: string;
    title: string;
    creatorId: string;
    type: string;
    fileId: string;
    mainFile: {
        path: string;
        inR2: boolean;
        inSupabase: boolean;
        status: 'complete' | 'needs_migration' | 'missing';
    };
    thumbnail: {
        path: string;
        inR2: boolean;
        inSupabase: boolean;
        status: 'complete' | 'needs_migration' | 'missing';
    };
}

async function main() {
    // 2. Dynamic import for StorageService
    const StorageServiceModule = await import('../services/storage.service');
    const StorageService = StorageServiceModule.default || StorageServiceModule;

    // 3. Setup Supabase
    const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('❌ Missing required environment variables');
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    async function checkSupabaseFile(bucketName: string, filePath: string): Promise<boolean> {
        try {
            // Try to get file metadata directly
            const { data, error } = await supabase.storage
                .from(bucketName)
                .download(filePath);

            if (error) {
                // File doesn't exist or can't be accessed
                return false;
            }

            return data !== null;
        } catch {
            return false;
        }
    }

    console.log('📋 Generating Missing Files Report\n');

    const report: FileReport[] = [];
    const summary = {
        totalContent: 0,
        totalFiles: 0,
        completeInR2: 0,
        needsMigration: 0,
        missingFromBoth: 0,
        partiallyMissing: 0
    };

    try {
        // Fetch all content
        const { data: contentList, error } = await supabase
            .from('content')
            .select('id, creator_id, files, type, title')
            .order('created_at', { ascending: false });

        if (error) throw error;

        summary.totalContent = contentList?.length || 0;
        console.log(`📦 Analyzing ${summary.totalContent} content items...\n`);

        for (const content of contentList || []) {
            if (!content.files || !Array.isArray(content.files)) continue;

            for (const file of content.files) {
                summary.totalFiles++;
                const fileId = file.id;

                // Check main file
                const mainPath = `${content.creator_id}/${fileId}`;
                const mainInR2 = await StorageService.existsInPrivate(mainPath);
                const mainInSupabase = await checkSupabaseFile('creator-content', mainPath);

                // Check thumbnail
                const thumbPath = `${content.creator_id}/thumb-${fileId}.webp`;
                const thumbInR2 = await StorageService.existsInPrivate(thumbPath);
                const thumbInSupabase = await checkSupabaseFile('creator-content', thumbPath);

                // Determine status
                let mainStatus: 'complete' | 'needs_migration' | 'missing';
                if (mainInR2) mainStatus = 'complete';
                else if (mainInSupabase) mainStatus = 'needs_migration';
                else mainStatus = 'missing';

                let thumbStatus: 'complete' | 'needs_migration' | 'missing';
                if (thumbInR2) thumbStatus = 'complete';
                else if (thumbInSupabase) thumbStatus = 'needs_migration';
                else thumbStatus = 'missing';

                const fileReport: FileReport = {
                    contentId: content.id,
                    title: content.title,
                    creatorId: content.creator_id,
                    type: content.type,
                    fileId,
                    mainFile: {
                        path: mainPath,
                        inR2: mainInR2,
                        inSupabase: mainInSupabase,
                        status: mainStatus
                    },
                    thumbnail: {
                        path: thumbPath,
                        inR2: thumbInR2,
                        inSupabase: thumbInSupabase,
                        status: thumbStatus
                    }
                };

                report.push(fileReport);

                // Update summary
                if (mainStatus === 'complete' && thumbStatus === 'complete') {
                    summary.completeInR2++;
                } else if (mainStatus === 'needs_migration' || thumbStatus === 'needs_migration') {
                    summary.needsMigration++;
                } else if (mainStatus === 'missing' && thumbStatus === 'missing') {
                    summary.missingFromBoth++;
                } else {
                    summary.partiallyMissing++;
                }

                // Show progress
                if (summary.totalFiles % 10 === 0) {
                    console.log(`   Processed ${summary.totalFiles} files...`);
                }
            }
        }

        // Save report to JSON file
        const reportPath = path.resolve(__dirname, '../../storage-report.json');
        fs.writeFileSync(reportPath, JSON.stringify({ summary, files: report }, null, 2));

        // Print summary
        console.log('\n' + '='.repeat(80));
        console.log('📊 STORAGE STATUS REPORT');
        console.log('='.repeat(80));
        console.log(`Total Content Items:           ${summary.totalContent}`);
        console.log(`Total Files:                   ${summary.totalFiles}`);
        console.log(`✅ Complete in R2:              ${summary.completeInR2} (${((summary.completeInR2 / summary.totalFiles) * 100).toFixed(1)}%)`);
        console.log(`📦 Need Migration:              ${summary.needsMigration} (${((summary.needsMigration / summary.totalFiles) * 100).toFixed(1)}%)`);
        console.log(`🚨 Missing from Both:           ${summary.missingFromBoth} (${((summary.missingFromBoth / summary.totalFiles) * 100).toFixed(1)}%)`);
        console.log(`⚠️  Partially Missing:          ${summary.partiallyMissing} (${((summary.partiallyMissing / summary.totalFiles) * 100).toFixed(1)}%)`);
        console.log('='.repeat(80));

        // List missing content
        const missingContent = report.filter(f =>
            f.mainFile.status === 'missing' || f.thumbnail.status === 'missing'
        );

        if (missingContent.length > 0) {
            console.log('\n🚨 CONTENT WITH MISSING FILES:');
            missingContent.forEach((file, index) => {
                console.log(`\n${index + 1}. Content ID: ${file.contentId}`);
                console.log(`   Title: ${file.title}`);
                console.log(`   Type: ${file.type}`);
                console.log(`   Main File: ${file.mainFile.status} (R2: ${file.mainFile.inR2}, Supabase: ${file.mainFile.inSupabase})`);
                console.log(`   Thumbnail: ${file.thumbnail.status} (R2: ${file.thumbnail.inR2}, Supabase: ${file.thumbnail.inSupabase})`);
            });
        }

        // List files needing migration
        const needsMigration = report.filter(f =>
            f.mainFile.status === 'needs_migration' || f.thumbnail.status === 'needs_migration'
        );

        if (needsMigration.length > 0) {
            console.log('\n📦 CONTENT THAT NEEDS MIGRATION:');
            needsMigration.forEach((file, index) => {
                console.log(`${index + 1}. Content ID: ${file.contentId} - ${file.title}`);
            });
        }

        console.log(`\n💾 Full report saved to: ${reportPath}`);

    } catch (error) {
        console.error('❌ Error generating report:', error);
        process.exit(1);
    }
}

main().catch(console.error);
