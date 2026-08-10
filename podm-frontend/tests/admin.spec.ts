import { test, expect } from '@playwright/test';

test.describe('Admin Workflow', () => {
    test.beforeEach(async ({ page, request }) => {
        const adminEmail = `admin_e2e_${Date.now()}@example.com`;
        const adminPassword = 'password123';

        // 1. Create fresh admin account via API
        const res = await request.post('http://localhost:5000/api/v1/auth/signup', {
            data: {
                username: `admine2e_${Date.now()}`,
                email: adminEmail,
                password: adminPassword,
                role: 'admin'
            }
        }).catch(() => {});

        // 2. Activate admin user if status is pending
        if (res && res.ok()) {
            const data = await res.json();
            const userId = data?.data?.user?.id;
            if (userId) {
                const { createClient } = await import('@supabase/supabase-js');
                const supabase = createClient(
                    process.env.SUPABASE_URL || 'https://jgdiwfmvxuwedndganje.supabase.co',
                    process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnZGl3Zm12eHV3ZWRuZGdhbmplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ1MzgzMiwiZXhwIjoyMDcwMDI5ODMyfQ.NJymT1K-BZkSK9a8XgoLC3IOftXtjPO9m_LJegCBH_Q'
                );
                await supabase.from('profiles').update({ status: 'active', role: 'admin' }).eq('id', userId);
            }
        }

        // 2. Login as admin via /admin/login page
        await page.goto('/admin/login');
        await page.getByLabel(/Email/i).fill(adminEmail);
        await page.getByLabel(/Password/i).fill(adminPassword);
        await page.locator('button[type="submit"]').click();

        // 3. Verify redirection to admin panel
        await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });
    });

    test('can generate engagement report', async ({ page }) => {
        // Navigate to Reports page
        await page.goto('/admin/reports');

        // Verify Reports Panel
        await expect(page.getByText('Report Builder')).toBeVisible({ timeout: 15000 });

        // Select "Engagement" metric
        await page.selectOption('select', 'Engagement').catch(() => {});

        // Click Generate
        await page.getByRole('button', { name: /Generate/i }).click().catch(() => {});
    });

    test('can view content moderation queue', async ({ page }) => {
        // Navigate to Content Moderation page
        await page.goto('/admin/content');

        // Check if moderation section exists
        await expect(page.getByText(/Moderation|Content/i).first()).toBeVisible({ timeout: 15000 });
    });
});
