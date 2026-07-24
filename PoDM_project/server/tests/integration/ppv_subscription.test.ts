import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_URL = 'http://localhost:5000/api/v1';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

jest.setTimeout(30000);

describe('PPV Subscription Enforcement Integration Tests', () => {
    let creatorToken: string;
    let fanToken: string;
    let fanId: string;
    let creatorId: string;
    let contentId: string;
    const fanEmail = `testfan_ppv_${Date.now()}@example.com`;
    const fanPassword = 'password123';

    beforeAll(async () => {
        // 1. Login as Creator (assuming seeded creator exists)
        try {
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                email: 'creator@example.com',
                password: 'password123'
            });
            creatorToken = loginRes.data.data.token;
            creatorId = loginRes.data.data.user._id;
        } catch (e) {
            console.error('Failed to login as creator. Ensure seed data is present.');
            throw e;
        }

        // 2. Create PPV Content
        try {
            // We need to use FormData for content creation
            // But for simplicity, let's insert directly into DB or use a simpler endpoint if available.
            // Using DB insertion to avoid file upload complexity in test.
            const { data: content, error } = await supabase
                .from('content')
                .insert({
                    creator_id: creatorId,
                    title: 'Integration Test PPV',
                    description: 'Test Description',
                    visibility: 'pay_per_view',
                    price: 500, // $5.00
                    type: 'video',
                    status: 'published',
                    files: [{ url: 'test.mp4', type: 'video/mp4', thumbnailUrl: 'thumb.jpg' }]
                })
                .select()
                .single();

            if (error) throw error;
            contentId = content.id;
        } catch (e: any) {
            console.error('Failed to create content:', e);
            require('fs').writeFileSync('error_log.txt', JSON.stringify(e, null, 2));
            throw e;
        }

        // 3. Register and Login new Fan
        try {
            await axios.post(`${API_URL}/auth/signup`, {
                username: `testfan_ppv_${Date.now()}`,
                email: fanEmail,
                password: fanPassword,
                role: 'fan'
            });

            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                email: fanEmail,
                password: fanPassword
            });
            fanToken = loginRes.data.data.token;
            fanId = loginRes.data.data.user._id;
        } catch (e) {
            console.error('Failed to register/login fan:', e);
            throw e;
        }
    });

    afterAll(async () => {
        // Cleanup
        if (fanId) await supabase.from('profiles').delete().eq('id', fanId);
        if (contentId) await supabase.from('content').delete().eq('id', contentId);
    });

    it('should BLOCK unlock request if NOT subscribed', async () => {
        try {
            await axios.post(`${API_URL}/payments/unlock-post`,
                { contentId },
                { headers: { Authorization: `Bearer ${fanToken}` } }
            );
            fail('Should have thrown 403. Instead got 200 OK.');
        } catch (error: any) {
            if (error.response) {
                console.log('Block test response:', error.response.status, error.response.data);
                expect(error.response.status).toBe(403);
                expect(error.response.data.message).toContain('must be subscribed');
            } else {
                console.error('Block test network error:', error.message);
                throw error;
            }
        }
    });

    it('should ALLOW unlock request if SUBSCRIBED', async () => {
        // 1. Manually subscribe fan to creator in DB
        const { error } = await supabase.from('subscriptions').insert({
            fan_id: fanId,
            creator_id: creatorId,
            tier_id: 'tier1',
            status: 'active',
            blockchain_tx_hash: 'sub_test_manual'
        });
        if (error) throw error;

        // 2. Attempt unlock again
        try {
            const response = await axios.post(`${API_URL}/payments/unlock-post`,
                { contentId },
                { headers: { Authorization: `Bearer ${fanToken}` } }
            );
            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data.data.clientSecret).toBeDefined();
        } catch (error: any) {
            console.error('Unlock failed even after subscribing:', error.message);
            require('fs').writeFileSync(path.resolve(__dirname, 'allow_error_log.txt'), JSON.stringify({
                message: error.message,
                response: error.response?.data,
                stack: error.stack
            }, null, 2));
            throw error;
        }
    });
});
