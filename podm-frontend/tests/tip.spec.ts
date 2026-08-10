import { test, expect } from '@playwright/test';

test('fan can send a tip to a creator', async ({ page, request }) => {
    // Capture console logs
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));

    // Capture 500 errors
    page.on('response', async response => {
        if (response.status() === 500) {
            console.log(`500 Error from ${response.url()}:`);
            console.log(await response.text());
        }
    });

    // 0. Ensure fan user exists
    await request.post('http://localhost:5000/api/v1/auth/signup', {
        data: {
            username: 'fan_e2e_user',
            email: 'fan@example.com',
            password: 'password123',
            role: 'fan'
        }
    }).catch(() => {});

    // 1. Login as a fan
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).first().click();
    await page.getByLabel(/Email/i).fill('fan@example.com');
    await page.getByLabel(/Password/i).fill('password123');
    await page.locator('button[type="submit"]').click();

    // Wait for feed/dashboard to load
    await expect(page).toHaveURL(/(\/fan\/feed|\/hub|\/)/, { timeout: 15000 });

    // Navigate to the creator's profile to ensure we see content
    await page.goto('/creator/creator');
    console.log('Navigated to /creator/creator');

    // Check if we are stuck on loading
    if (await page.getByText('Loading...').isVisible()) {
        console.log('Page is loading...');
        await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });
    }

    console.log('Checking for Jane Creator...');
    // Print body text if it fails
    try {
        await expect(page.getByText('Jane Creator').first()).toBeVisible({ timeout: 5000 });
    } catch (e) {
        console.log('Failed to find Jane Creator. Page content:');
        console.log(await page.locator('body').innerText());
        throw e;
    }

    // 2. Find a post and click the Tip button
    // We assume there is at least one post in the feed.
    // The Tip button is inside the PostCard.
    const tipButton = page.locator('button:has-text("Tip")').first();
    await expect(tipButton).toBeVisible({ timeout: 10000 });
    await tipButton.click();

    // 3. Verify Tip Modal opens
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal.getByRole('heading', { name: 'Send a Tip' })).toBeVisible();
});
