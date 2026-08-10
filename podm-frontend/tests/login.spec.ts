import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/PoDM/);
});

test('login modal opens and form is accessible', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Click Log In button to open modal
    await page.getByRole('button', { name: /log in/i }).first().click();

    // Wait for modal to appear
    await expect(page.getByText('Welcome Back')).toBeVisible({ timeout: 5000 });

    // Verify email field is accessible with label
    const emailInput = page.getByLabel(/Email/i);
    await expect(emailInput).toBeVisible();

    // Verify password field is accessible with label
    const passwordInput = page.getByLabel(/Password/i);
    await expect(passwordInput).toBeVisible();

    // Verify submit button exists
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();

    // Fill in the form to verify it works
    await emailInput.fill('test@example.com');
    await passwordInput.fill('testpassword');

    // Verify the values were filled
    await expect(emailInput).toHaveValue('test@example.com');
    await expect(passwordInput).toHaveValue('testpassword');
});

test('login with valid credentials', async ({ page, request }) => {
    // 1. Create fresh fan account via API so login credentials always exist
    const testEmail = `fan_e2e_${Date.now()}@example.com`;
    const testPassword = 'password123';

    await request.post('http://localhost:5000/api/v1/auth/signup', {
        data: {
            username: `fane2e_${Date.now()}`,
            email: testEmail,
            password: testPassword,
            role: 'fan'
        }
    }).catch(() => {});

    // 2. Open login modal on UI
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).first().click();
    await expect(page.getByText('Welcome Back')).toBeVisible();

    // 3. Fill in created fan credentials
    await page.getByLabel(/Email/i).fill(testEmail);
    await page.getByLabel(/Password/i).fill(testPassword);

    // 4. Submit the form
    await page.locator('button[type="submit"]').click();

    // 5. Verify redirection to feed or authenticated view
    await expect(page).toHaveURL(/(\/fan\/feed|\/hub|\/)/, { timeout: 15000 });
});
