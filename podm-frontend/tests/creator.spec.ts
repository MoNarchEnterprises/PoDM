import { test, expect } from '@playwright/test';

test.describe('Creator Workflow', () => {
    test.beforeEach(async ({ page, request }) => {
        // Listen for console logs
        page.on('console', msg => console.log(`[Browser Console] ${msg.text()}`));
        page.on('pageerror', err => console.log(`[Browser Error] ${err.message}`));
        page.on('requestfailed', request => console.log(`[Request Failed] ${request.url()} ${request.failure()?.errorText}`));

        // Ensure creator account exists
        await request.post('http://localhost:5000/api/v1/auth/signup', {
            data: {
                username: 'creator_e2e_user',
                email: 'creator@example.com',
                password: 'password123',
                role: 'creator'
            }
        }).catch(() => {});

        // Login as creator before each test
        await page.goto('/');
        await page.getByRole('button', { name: /log in/i }).first().click();
        await page.getByLabel(/Email/i).fill('creator@example.com');
        await page.getByLabel(/Password/i).fill('password123');
        await page.locator('button[type="submit"]').click();

        // Corrected: Creator dashboard is at /hub
        await expect(page).toHaveURL(/\/hub/, { timeout: 15000 });
    });

    test('can access dashboard and see earnings', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
        await expect(page.getByText('Earnings (Month)')).toBeVisible();
    });

    test('can create a text post (as photo post with text)', async ({ page }) => {
        console.log('[Test] Starting create p- ost test...');
        // Navigate directly to Content page
        await page.goto('/hub/content');
        console.log('[Test] Navigated to /hub/content');

        // This wait might help if JS is still hydrating
        await page.waitForLoadState('domcontentloaded');

        // Click Upload New Content to open modal
        // Wait for button to be visible explicitly
        const uploadBtn = page.getByRole('button', { name: /Upload New Content/i });
        await expect(uploadBtn).toBeVisible();
        await uploadBtn.click();
        console.log('[Test] Clicked Upload New Content');

        // Modal interaction
        await expect(page.getByRole('heading', { name: 'Upload New Content' })).toBeVisible();
        console.log('[Test] Modal visible');

        await page.getByLabel(/Title/i).fill('Test Post Title');
        await page.getByLabel(/Description/i).fill('Test Description');

        // Upload dummy file
        // Ensure input is present
        const fileInput = page.locator('input[type="file"]');
        await expect(fileInput).toBeAttached();

        await fileInput.setInputFiles({
            name: 'test.png',
            mimeType: 'image/png',
            buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64')
        });
        console.log('[Test] File uploaded');

        // Select Visibility (Subscribers Only by default)

        await page.getByRole('button', { name: /Post Now/i }).click();
        console.log('[Test] Clicked Post Now');

        // Verify success
        // It should close modal and appear in list.
        await expect(page.getByRole('heading', { name: 'Upload New Content' })).not.toBeVisible(); // Modal closed
        // Wait for content refresh - reload to verify persistence and avoid race conditions
        await page.reload();
        await expect(page.getByText('Test Post Title').first()).toBeVisible({ timeout: 15000 });
        console.log('[Test] Test Post Verified');
    });

    test('can create a PPV post', async ({ page }) => {
        await page.goto('/hub/content');
        const uploadBtn = page.getByRole('button', { name: /Upload New Content/i });
        await expect(uploadBtn).toBeVisible();
        await uploadBtn.click();

        await page.getByLabel(/Title/i).fill('PPV Post');

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'ppv.png',
            mimeType: 'image/png',
            buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64')
        });

        // Select PPV visibility
        await page.getByLabel('Pay Per View (PPV)').check();

        // Set Price
        await page.getByLabel(/Price/i).fill('5'); // $5

        await page.getByRole('button', { name: /Post Now/i }).click();

        await expect(page.getByRole('heading', { name: 'Upload New Content' })).not.toBeVisible();
        await page.reload();
        await expect(page.getByText('PPV Post').first()).toBeVisible({ timeout: 15000 });
    });
});
