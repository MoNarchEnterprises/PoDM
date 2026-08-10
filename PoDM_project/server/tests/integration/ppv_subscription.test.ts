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
        // 0. Verify server is running
        try {
            await axios.get('http://localhost:5000/', { timeout: 2000 });
        } catch {
            throw new Error(`Backend dev server is not running on http://localhost:5000. Start the server with 'npm run dev:server' before running integration tests.`);
        }

        // 1. Login as Creator (assuming seeded creator exists, or create fallback)
        try {
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                email: 'creator@example.com',
                password: 'password123'
            });
            creatorToken = loginRes.data.data.token;
            creatorId = loginRes.data.data.user.id || loginRes.data.data.user._id;
        } catch {
            try {
                await axios.post(`${API_URL}/auth/signup`, {
                    username: 'creator_example_test',
                    email: 'creator@example.com',
                    password: 'password123',
                    role: 'creator'
                });
                const loginRes = await axios.post(`${API_URL}/auth/login`, {
                    email: 'creator@example.com',
                    password: 'password123'
                });
                creatorToken = loginRes.data.data.token;
                creatorId = loginRes.data.data.user.id || loginRes.data.data.user._id;
            } catch (e) {
                console.error('Failed to setup/login creator:', e);
                throw e;
            }
        }

        // 2. Create Subscribers-Only Content
        try {
            const { data: content, error } = await supabase
                .from('content')
                .insert({
                    creator_id: creatorId,
                    title: 'Integration Test Content',
                    description: 'Test Description',
                    visibility: 'subscribers_only',
                    price: 0,
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
            fanId = loginRes.data.data.user.id || loginRes.data.data.user._id;
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
            await axios.get(`${API_URL}/content/${contentId}/view`,
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
            start_date: new Date().toISOString()
        });
        if (error) throw error;

        // 2. Attempt viewing content again
        try {
            const response = await axios.get(`${API_URL}/content/${contentId}/view`,
                { headers: { Authorization: `Bearer ${fanToken}` } }
            );
            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data.data.secureUrl).toBeDefined();
        } catch (error: any) {
            console.error('Viewing content failed even after subscribing:', error.message);
            require('fs').writeFileSync(path.resolve(__dirname, 'allow_error_log.txt'), JSON.stringify({
                message: error.message,
                response: error.response?.data,
                stack: error.stack
            }, null, 2));
            throw error;
        }
    });
});
