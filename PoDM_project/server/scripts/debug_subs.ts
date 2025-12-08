import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
// import * as SubscriptionModel from '../models/subscription.model';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const run = async () => {
    let fanId: string = '';
    let creatorId: string = '';

    try {
        // Create dummy users directly in DB
        const { data: fan, error: fanError } = await supabase.auth.admin.createUser({
            email: `debug_fan_${Date.now()}@test.com`,
            password: 'password123',
            email_confirm: true
        });
        if (fanError) throw fanError;
        fanId = fan.user.id;

        const { data: creator, error: creatorError } = await supabase.auth.admin.createUser({
            email: `debug_creator_${Date.now()}@test.com`,
            password: 'password123',
            email_confirm: true
        });
        if (creatorError) throw creatorError;
        creatorId = creator.user.id;

        // Create profiles
        await supabase.from('profiles').insert([
            { id: fanId, username: `fan_${Date.now()}`, email: fan.user.email, role: 'fan' },
            { id: creatorId, username: `creator_${Date.now()}`, email: creator.user.email, role: 'creator' }
        ]);

        // Check existing subs
        const { data: existing } = await supabase.from('subscriptions').select().limit(1);
        console.log('Existing sub structure:', existing);

        /*
        console.log('Fan ID:', fanId);
        console.log('Creator ID:', creatorId);

        // Create subscription
        const { data: insertedSub, error: subError } = await supabase.from('subscriptions').insert({
            fan_id: fanId,
            creator_id: creatorId,
            tier_id: 'tier1',
            status: 'active',
            stripe_subscription_id: 'sub_debug',
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }).select().single();
        
        if (subError) throw subError;
        console.log('Inserted sub:', insertedSub);
        */

        const SubscriptionModel = require('../models/subscription.model');
        const subs = await SubscriptionModel.findActiveSubscriptionsByFan(fanId);
        console.log('Found subs:', JSON.stringify(subs, null, 2));

        if (!subs || subs.length === 0) {
            console.error('No subscriptions found!');
        } else if (subs[0].creator_id !== creatorId) {
            console.error('Creator ID mismatch!');
        } else {
            console.log('SUCCESS: Subscription found correctly.');
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        if (fanId) {
            await supabase.from('profiles').delete().eq('id', fanId);
            await supabase.auth.admin.deleteUser(fanId);
        }
        if (creatorId) {
            await supabase.from('profiles').delete().eq('id', creatorId);
            await supabase.auth.admin.deleteUser(creatorId);
        }
    }
};

run();
