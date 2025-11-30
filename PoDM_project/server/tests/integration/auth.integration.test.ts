import axios from 'axios';

const API_URL = 'http://localhost:5000/api/v1';

describe('Auth Integration Tests', () => {
    let fanToken: string;

    it('should login as seeded fan user', async () => {
        try {
            const response = await axios.post(`${API_URL}/auth/login`, {
                email: 'fan@example.com',
                password: 'password123'
            });

            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data.data.token).toBeDefined();
            expect(response.data.data.user.email).toBe('fan@example.com');

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
            expect(response.data.data.email).toBe('fan@example.com');
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
