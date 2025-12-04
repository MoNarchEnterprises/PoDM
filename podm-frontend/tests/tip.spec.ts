import { test, expect } from '@playwright/test';

test('fan can send a tip to a creator', async ({ page }) => {
    // Capture console logs
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));

    // Capture 500 errors
    page.on('response', async response => {
        if (response.status() === 500) {
            console.log(`500 Error from ${response.url()}:`);
            console.log(await response.text());
        }
    });

    // 1. Login as a fan
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).first().click();
    await page.getByLabel(/Email/i).fill('fan@example.com');
    await page.getByLabel(/Password/i).fill('password123');
    await page.locator('button[type="submit"]').click();

    // Wait for feed to load
    await expect(page).toHaveURL(/\/fan\/feed/);

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
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Send a Tip')).toBeVisible();

    // 4. Select an amount (default is $10, let's select $5)
    await modal.getByRole('button', { name: '$5', exact: true }).click();

    // 5. Send the tip
    // Note: If the user has no payment method, this might fail or require card entry.
    // For this test, we assume the seeded fan might have a payment method or we check for the card form.

    // Check if card form is present (iframe)
    // We expect the card form to be present because the seed user has no valid payment method ID
    const cardFrame = page.frameLocator('iframe[title*="card payment input"]'); // More flexible selector

    try {
        await expect(cardFrame.locator('input[name="cardnumber"]')).toBeVisible({ timeout: 5000 });
        console.log('Card form visible. Filling...');
        await cardFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
        await cardFrame.locator('input[name="exp-date"]').fill('12/34');
        await cardFrame.locator('input[name="cvc"]').fill('123');
        await cardFrame.locator('input[name="postal"]').fill('12345');
    } catch (e) {
        console.log('Card form not found or not needed.');
    }

    await modal.getByRole('button', { name: /Send Tip/i }).click();

    // 6. Verify Success
    await expect(modal.getByText('Tip Sent!')).toBeVisible({ timeout: 15000 });
    await expect(modal.getByText('You sent $5')).toBeVisible();

    // 7. Close modal
    await modal.getByRole('button', { name: 'Done' }).click();
    await expect(modal).not.toBeVisible();
});
