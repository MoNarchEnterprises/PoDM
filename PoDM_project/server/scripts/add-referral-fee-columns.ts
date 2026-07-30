/**
 * Migration: Add referral_fee and referrer_id to transactions table,
 *             and referral_fee_earned to referrals table.
 *
 * To run: open your Supabase dashboard → SQL Editor → paste the SQL below
 *
 *   ALTER TABLE transactions ADD COLUMN IF NOT EXISTS referral_fee INTEGER DEFAULT 0;
 *   ALTER TABLE transactions ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES profiles(id);
 *   ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referral_fee_earned INTEGER DEFAULT 0;
 */

import supabase from '../config/supabaseClient';

async function addReferralFeeColumns() {
    console.log('Starting migration: Add referral_fee and referrer_id to transactions...');

    try {
        const { error } = await supabase.rpc('exec_sql', {
            sql: `
                ALTER TABLE transactions ADD COLUMN IF NOT EXISTS referral_fee INTEGER DEFAULT 0;
                ALTER TABLE transactions ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES profiles(id);
                ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referral_fee_earned INTEGER DEFAULT 0;
            `
        });

        if (error) {
            console.error('Error adding referral fee columns:', error);
            console.log('');
            console.log('To run this migration manually, paste the following SQL into your Supabase Dashboard SQL Editor:');
            console.log('');
            console.log('  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS referral_fee INTEGER DEFAULT 0;');
            console.log('  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES profiles(id);');
            console.log('  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referral_fee_earned INTEGER DEFAULT 0;');
            throw error;
        }

        console.log('Successfully added referral_fee and referrer_id to transactions');
        console.log('Successfully added referral_fee_earned to referrals');
        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

addReferralFeeColumns()
    .then(() => {
        console.log('All done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
