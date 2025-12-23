// Script to fix mislabeled content in the database
// This fixes content where type='photo' but the file is actually a video

import supabase from '../config/supabaseClient';

async function fixMislabeledContent() {
    console.log('🔍 Starting to check for mislabeled content...\n');

    try {
        // 1. Fetch all content from the database
        const { data: allContent, error: fetchError } = await supabase
            .from('content')
            .select('*');

        if (fetchError) {
            console.error('❌ Error fetching content:', fetchError);
            return;
        }

        console.log(`📊 Found ${allContent?.length || 0} total content items\n`);

        let fixedCount = 0;
        const itemsToFix = [];

        // 2. Check each content item
        for (const content of allContent || []) {
            // Check if files array exists and has at least one file
            if (!content.files || !Array.isArray(content.files) || content.files.length === 0) {
                continue;
            }

            // Get the first file's mimeType
            const firstFile = content.files[0];
            const mimeType = firstFile?.mimeType;

            if (!mimeType) {
                continue;
            }

            // Determine what the type SHOULD be based on mimeType
            let correctType: string | null = null;
            if (mimeType.startsWith('video/')) {
                correctType = 'video';
            } else if (mimeType.startsWith('image/')) {
                correctType = 'photo';
            } else if (mimeType.startsWith('audio/')) {
                correctType = 'audio';
            }

            // If the current type doesn't match the correct type, mark it for fixing
            if (correctType && content.type !== correctType) {
                console.log(`⚠️  Content ID ${content.id}: type='${content.type}' but mimeType='${mimeType}'`);
                itemsToFix.push({
                    id: content.id,
                    currentType: content.type,
                    correctType: correctType,
                    mimeType: mimeType,
                    title: content.title
                });
            }
        }

        console.log(`\n📋 Found ${itemsToFix.length} items to fix\n`);

        if (itemsToFix.length === 0) {
            console.log('✅ No mislabeled content found!');
            return;
        }

        // 3. Fix each mislabeled item
        for (const item of itemsToFix) {
            console.log(`🔧 Fixing "${item.title}" (ID: ${item.id})`);
            console.log(`   Current: ${item.currentType} → Correct: ${item.correctType}`);

            const { error: updateError } = await supabase
                .from('content')
                .update({ type: item.correctType })
                .eq('id', item.id);

            if (updateError) {
                console.error(`   ❌ Error updating: ${updateError.message}`);
            } else {
                console.log(`   ✅ Fixed successfully`);
                fixedCount++;
            }
        }

        console.log(`\n🎉 Fixed ${fixedCount} out of ${itemsToFix.length} items`);

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the script
fixMislabeledContent()
    .then(() => {
        console.log('\n✅ Script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
