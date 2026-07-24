import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
import supabase from '../config/supabaseClient';

const verify = async () => {
    console.log('Starting verification script...');

    // 1. Get Fan User
    const { data: fanData, error: fanError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', 'fan@example.com')
        .single();

    if (fanError || !fanData) {
        console.error('Fan not found:', fanError);
        process.exit(1);
    }
    const fanId = fanData.id;
    console.log(`Fan ID: ${fanId}`);

    // 2. Get Content
    let { data: contentData, error: contentError } = await supabase
        .from('content')
        .select('id, creator_id, title')
        .eq('title', 'Exclusive Video')
        .single();

    if (!contentData) {
        console.log('Exclusive Video not found, fetching any PPV content...');
        const result = await supabase
            .from('content')
            .select('id, creator_id, title')
            .eq('visibility', 'pay_per_view')
            .limit(1)
            .single();
        contentData = result.data;
        contentError = result.error;
    }

    if (contentError || !contentData) {
        console.error('Content not found:', contentError);
        process.exit(1);
    }
    const contentId = contentData.id;
    console.log(`Content ID: ${contentId}`);

    // 3. Check for existing transaction
    const { data: existingTx, error: txError } = await supabase
        .from('transactions')
        .select('id')
        .eq('fan_id', fanId)
        .eq('related_content_id', contentId)
        .eq('status', 'Cleared')
        .single();

    if (existingTx) {
        console.log('Content already unlocked via transaction:', existingTx.id);
    } else {
        // 4. Create Transaction
        const { data: newTx, error: createError } = await supabase
            .from('transactions')
            .insert({
                fan_id: fanId,
                creator_id: contentData.creator_id,
                amount: 500,
                type: 'PPV Post',
                status: 'Cleared',
                related_content_id: contentId,
                blockchain_tx_hash: 'pi_manual_verification_' + Date.now(),
                platform_fee: 50,
                creator_payout: 450
            })
            .select()
            .single();

        if (createError) {
            console.error('Error creating transaction:', createError);
            process.exit(1);
        }
        console.log('Created manual transaction:', newTx.id);
    }

    // 5. Verify enrichContentWithUnlockStatus
    const { enrichContentWithUnlockStatus } = require('../utils/content.utils');
    const contentList = [{
        id: contentId,
        creator_id: contentData.creator_id,
        visibility: 'pay_per_view',
        price: 500
    }];

    console.log('Verifying unlock status...');
    const enriched = await enrichContentWithUnlockStatus(contentList, fanId);
    console.log('Enriched Content:', JSON.stringify(enriched, null, 2));

    if (enriched[0].isUnlocked === true) {
        console.log('SUCCESS: Content is unlocked!');
    } else {
        console.error('FAILURE: Content is still locked!');
        process.exit(1);
    }

    process.exit(0);
};

verify().catch(err => {
    console.error(err);
    process.exit(1);
});
