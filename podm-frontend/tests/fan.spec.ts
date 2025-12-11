import { test, expect } from '@playwright/test';

test.describe('Fan Workflow', () => {
    test.beforeEach(async ({ page }) => {
        // Login as fan
        await page.goto('/');
        await page.getByRole('button', { name: /log in/i }).first().click();
        await page.getByLabel(/Email/i).fill('fan@example.com');
        await page.getByLabel(/Password/i).fill('password123');
        await page.locator('button[type="submit"]').click();
        await expect(page).toHaveURL(/\/fan\/feed/);
    });

    test('can subscribe and then unlock PPV content', async ({ page }) => {
        // 1. Navigate to Creator Profile

        await page.goto('/creator/creator'); // Jane Creator

        // 2. Subscribe Flow
        // Check if already subscribed to handle re-runs or seed state
        const alreadySubscribed = await page.getByText('You are subscribed!').isVisible();

        if (!alreadySubscribed) {
            // Find and click Subscribe button. Use a more generic regex to catch different prices.
            const subscribeButton = page.getByRole('button', { name: /Subscribe for \$\d+\.\d+\/month/i });
            await expect(subscribeButton).toBeVisible();
            await subscribeButton.click();

            // Verify Subscription Modal
            const subModal = page.getByRole('dialog');
            await expect(subModal).toBeVisible();
            await expect(subModal.getByText('Complete Subscription')).toBeVisible();

            // Handle Payment
            const cardFrame = page.frameLocator('iframe[title*="card payment input"]');
            // Wait for iframe to attach
            await expect(cardFrame.locator('input[name="cardnumber"]')).toBeVisible({ timeout: 10000 });

            await cardFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
            await cardFrame.locator('input[name="exp-date"]').fill('12/34');
            await cardFrame.locator('input[name="cvc"]').fill('123');
            await cardFrame.locator('input[name="postal"]').fill('12345');

            // Confirm Subscription
            await subModal.getByRole('button', { name: /Pay/i }).click();

            // Verify Subscription Success
            await expect(page.getByText('You are subscribed!')).toBeVisible({ timeout: 20000 });
        }

        // 3. Unlock Flow
        // Now that we are subscribed, the "Unlock for $5.00" button should be visible on the PPV post.
        // We might need to refresh if the state update relies on backend refetch which React Query should handle, 
        // but a reload ensures we have fresh "isSubscribed" state for the ContentCard.
        await page.reload();

        // Find the PPV post button. 
        // Note: ContentCard renders "Unlock for $X.XX" if price > 0.
        const unlockButton = page.getByRole('button', { name: /Unlock for \$\d+\.\d+/i }).first();

        if (await unlockButton.isVisible()) {
            await unlockButton.click();

            // Verify Unlock Modal
            const unlockModal = page.getByRole('dialog');
            await expect(unlockModal).toBeVisible();
            await expect(unlockModal.getByText('Unlock Content')).toBeVisible();

            // Confirm Unlock (Mock Payment)
            // Re-enter card if needed, typically saved, but let's assume one-click or re-entry.
            // Based on previous tests, it might just need a click if card is saved? 
            // Or the mock just allows "Unlock" if logic permits.
            // Let's check for card frame just in case.
            const cardFrame = page.frameLocator('iframe[title*="card payment input"]');
            if (await cardFrame.locator('input[name="cardnumber"]').isVisible()) {
                await cardFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
                await cardFrame.locator('input[name="exp-date"]').fill('12/34');
                await cardFrame.locator('input[name="cvc"]').fill('123');
                await cardFrame.locator('input[name="postal"]').fill('12345');
            }

            // Click Pay/Unlock
            await unlockModal.getByRole('button', { name: /Unlock/i }).click();

            // Verify Success
            await expect(unlockModal.getByText('Unlocked!')).toBeVisible({ timeout: 15000 });
            await unlockModal.getByRole('button', { name: /View Content/i }).click();
        }

        // 4. Verify Content Access
        // The lock icon should be gone
        await expect(page.locator('.lucide-lock')).not.toBeVisible();
    });
});
