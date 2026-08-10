import axios from 'axios';

const API_URL = 'http://localhost:5000/api/v1';

describe('Auth Integration Tests', () => {
    let fanToken: string;
    const testEmail = `fan_test_${Date.now()}@example.com`;
    const testPassword = 'password123';
    let createdUserId: string;

    beforeAll(async () => {
        try {
            await axios.get('http://localhost:5000/', { timeout: 2000 });
        } catch {
            throw new Error(`Backend dev server is not running on http://localhost:5000. Start the server with 'npm run dev:server' before running integration tests.`);
        }

        // Register new fan user for integration testing
        try {
            const signupRes = await axios.post(`${API_URL}/auth/signup`, {
                username: `fan_test_${Date.now()}`,
                email: testEmail,
                password: testPassword,
                role: 'fan'
            });
            createdUserId = signupRes.data.data.user.id || signupRes.data.data.user._id;
        } catch (e: any) {
            console.error('Failed to register fan user for integration test:', e.response?.data || e.message);
            throw e;
        }
    });

    it('should login as seeded fan user', async () => {
        try {
            const response = await axios.post(`${API_URL}/auth/login`, {
                email: testEmail,
                password: testPassword
            });

            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data.data.token).toBeDefined();
            expect(response.data.data.user.email).toBe(testEmail);

            fanToken = response.data.data.token;
        } catch (error: any) {
            console.error('Login failed:', error.response?.data || error.message);
            throw error;
        }
    });

    it('should access protected profile route with token', async () => {
        expect(fanToken).toBeDefined();

        try {
            const response = await axios.get(`${API_URL}/users/me`, {
                headers: {
                    Authorization: `Bearer ${fanToken}`
                }
            });

            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data.data.email).toBe(testEmail);
        } catch (error: any) {
            console.error('Profile access failed:', error.response?.data || error.message);
            throw error;
        }
    });

    it('should fail to access protected route without token', async () => {
        try {
            await axios.get(`${API_URL}/users/me`);
            fail('Should have thrown 401');
        } catch (error: any) {
            expect(error.response.status).toBe(401);
        }
    });
});
