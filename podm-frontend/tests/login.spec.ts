import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    try {
        console.log('Navigating to /');
        await page.goto('/');
        console.log('Checking title');
        await expect(page).toHaveTitle(/PoDM/);
    } catch (e) {
        console.error('Test failed:', e);
        throw e;
    }
});

test('login link works', async ({ page }) => {
    try {
        console.log('Navigating to /login');
        await page.goto('/login');

        console.log('Checking heading');
        await expect(page.getByRole('heading', { name: /Sign in/i })).toBeVisible();

        console.log('Filling email');
        await page.getByLabel(/Email/i).fill('fan@example.com');
        console.log('Filling password');
        await page.getByLabel(/Password/i).fill('password123');

        console.log('Clicking sign in');
        await page.getByRole('button', { name: /Sign in/i }).click();

        // Add a small wait or check for redirect
        // await page.waitForURL('**/dashboard'); 
    } catch (e) {
        console.error('Test failed:', e);
        throw e;
    }
});
