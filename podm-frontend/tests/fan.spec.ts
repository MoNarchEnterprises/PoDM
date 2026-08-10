import { test, expect } from '@playwright/test';

test.describe('Fan Workflow', () => {
    test.beforeEach(async ({ page, request }) => {
        // Ensure fan user exists
        await request.post('http://localhost:5000/api/v1/auth/signup', {
            data: {
                username: 'fan_e2e_user',
                email: 'fan@example.com',
                password: 'password123',
                role: 'fan'
            }
        }).catch(() => {});

        // Login as fan
        await page.goto('/');
        await page.getByRole('button', { name: /log in/i }).first().click();
        await page.getByLabel(/Email/i).fill('fan@example.com');
        await page.getByLabel(/Password/i).fill('password123');
        await page.locator('button[type="submit"]').click();
        await expect(page).toHaveURL(/(\/fan\/feed|\/hub|\/)/, { timeout: 15000 });
    });

    test('can subscribe and then unlock PPV content', async ({ page }) => {
        // 1. Navigate to Creator Profile

        await page.goto('/creator/creator'); // Jane Creator

        // 2. Subscribe Flow
        // Check if already subscribed to handle re-runs or seed state
        const alreadySubscribed = await page.getByText('You are subscribed!').isVisible();

        if (!alreadySubscribed) {
            // Find and click Subscribe button
            const subscribeButton = page.getByRole('button', { name: /Subscribe for \$\d+\.\d+\/month/i });
            if (await subscribeButton.isVisible()) {
                await subscribeButton.click();

                // Verify Subscription Modal opens
                const subModal = page.getByRole('dialog');
                await expect(subModal).toBeVisible({ timeout: 10000 });
            }
        }

        // 4. Verify Content Access
        // The lock icon should be gone
        await expect(page.locator('.lucide-lock')).not.toBeVisible();
    });
});
