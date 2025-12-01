const { chromium } = require('playwright');

(async () => {
    console.log('Launching browser...');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        console.log('Navigating to http://localhost:5174/');
        await page.goto('http://localhost:5174/');

        console.log('Page title:', await page.title());

        if (!(await page.title()).includes('PoDM')) {
            console.error('Title mismatch!');
        } else {
            console.log('Title match!');
        }

        console.log('Clicking Log In button to open modal');
        await page.getByRole('button', { name: /log in/i }).click();

        console.log('Waiting for modal to appear...');
        await page.waitForSelector('text=Welcome Back', { timeout: 5000 });

        console.log('Taking screenshot of login modal...');
        await page.screenshot({ path: 'debug-login-modal.png' });

        console.log('Filling credentials...');
        await page.getByLabel(/Email/i).fill('fan@example.com');
        await page.getByLabel(/Password/i).fill('password123');

        console.log('Clicking Log In button in modal...');
        await page.getByRole('button', { name: /^Log In$/i }).click();

        console.log('Waiting for navigation...');
        try {
            await page.waitForURL('**/fan/feed', { timeout: 10000 });
            console.log('Login successful, redirected to fan feed!');
        } catch (e) {
            console.log('Navigation timeout or failed. Current URL:', page.url());
        }

        console.log('Taking screenshot after login...');
        await page.screenshot({ path: 'debug-after-login.png' });

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
})();
