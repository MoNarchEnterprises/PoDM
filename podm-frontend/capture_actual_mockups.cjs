const { chromium } = require('playwright');
const path = require('path');

(async () => {
    console.log('🚀 Starting PoDM Mockup Capture Automation...');
    const browser = await chromium.launch({ headless: true });
    
    // Set a large, crisp viewport matching standard premium displays (1440x900 or 1920x1080)
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2, // Retinal high-definition display density
    });
    
    const page = await context.newPage();

    // Directory path to save screenshots (artifacts folder)
    const artifactDir = 'C:\\Users\\leona\\.gemini\\antigravity\\brain\\1bd45d5b-0291-4693-8ea1-68a4571a46cb';
    const contestScreenshotPath = path.join(artifactDir, 'creator_contests_dashboard_1780058634555.png');
    const galleryScreenshotPath = path.join(artifactDir, 'fan_blurred_gallery_1780058649123.png');

    try {
        // ==========================================
        // SCENARIO 1: Fan's Gallery Screenshot (with Blur Retention Loop)
        // ==========================================
        console.log('\n--- Scenario 1: Fan Gallery ---');
        console.log('Navigating to http://localhost:5173/ to log in as Fan...');
        await page.goto('http://localhost:5173/');

        // Click Login and perform login
        await page.getByRole('button', { name: /log in/i }).first().click();
        await page.waitForSelector('text=Welcome Back', { timeout: 5000 });
        await page.getByLabel(/Email/i).fill('fan@example.com');
        await page.getByLabel(/Password/i).fill('password123');
        await page.locator('button[type="submit"]').click();
        await page.waitForURL('**/fan/feed', { timeout: 10000 });
        console.log('Logged in as Fan successfully.');

        // Setup API route interception for getFanGallery to feed beautiful high-fidelity mock assets
        console.log('Configuring gallery mock API routing...');
        await page.route('**/api/v1/users/me/gallery', async (route) => {
            const mockGalleryData = [
                {
                    creator: {
                        id: 'creator-jane',
                        profile: {
                            name: 'Jane Creator (Premium)',
                            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
                        }
                    },
                    activeSubscription: true,
                    content: [
                        {
                            contentId: 'jane-post-1',
                            addedDate: new Date().toISOString(),
                            content: {
                                title: 'Miami Poolside Shoot',
                                type: 'photo',
                                files: [{ thumbnailUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=500&auto=format&fit=crop&q=80' }],
                                stats: { views: 1250 }
                            }
                        },
                        {
                            contentId: 'jane-post-2',
                            addedDate: new Date(Date.now() - 86400000).toISOString(),
                            content: {
                                title: 'Studio Glamour Portraits',
                                type: 'photo',
                                files: [{ thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80' }],
                                stats: { views: 890 }
                            }
                        }
                    ]
                },
                {
                    creator: {
                        id: 'creator-lexi',
                        profile: {
                            name: 'Lexi VIP (Lapsed)',
                            avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
                        }
                    },
                    activeSubscription: false,
                    content: [
                        {
                            contentId: 'lexi-post-1',
                            addedDate: new Date(Date.now() - 172800000).toISOString(),
                            content: {
                                title: 'Sunset Beach Walk',
                                type: 'photo',
                                files: [{ thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80' }],
                                stats: { views: 3420 }
                            }
                        },
                        {
                            contentId: 'lexi-post-2',
                            addedDate: new Date(Date.now() - 259200000).toISOString(),
                            content: {
                                title: 'Exclusive Behind-The-Scenes',
                                type: 'video',
                                files: [{ thumbnailUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=500&auto=format&fit=crop&q=80' }],
                                stats: { views: 1820 }
                            }
                        }
                    ]
                }
            ];

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, data: mockGalleryData })
            });
        });

        // Navigate to the Gallery Page
        console.log('Navigating to Fan Gallery page (/fan/gallery)...');
        await page.goto('http://localhost:5173/fan/gallery');
        await page.waitForTimeout(3000); // Allow Unsplash images to load and CSS blurs to render

        console.log('Taking high-resolution screenshot of actual Fan Gallery...');
        await page.screenshot({ path: galleryScreenshotPath });
        console.log(`✅ Saved Fan Gallery mockup to ${galleryScreenshotPath}`);

        // Logout
        console.log('Logging out from Fan session...');
        await page.goto('http://localhost:5173/');
        await page.evaluate(() => localStorage.clear());
        await page.evaluate(() => sessionStorage.clear());

        // ==========================================
        // SCENARIO 2: Creator Contest Form Screenshot
        // ==========================================
        console.log('\n--- Scenario 2: Creator Contest Modal ---');
        console.log('Navigating to http://localhost:5173/ to log in as Creator...');
        await page.goto('http://localhost:5173/');
        
        // Open login modal
        await page.getByRole('button', { name: /log in/i }).first().click();
        await page.waitForSelector('text=Welcome Back', { timeout: 5000 });
        await page.getByLabel(/Email/i).fill('creator@example.com');
        await page.getByLabel(/Password/i).fill('password123');
        await page.locator('button[type="submit"]').click();
        await page.waitForURL('**/hub/dashboard', { timeout: 10000 });
        console.log('Logged in as Creator successfully.');

        // Navigate to dashboard and click Contests
        await page.waitForTimeout(2000); // Let dashboard load completely
        console.log('Opening Contests Manager modal...');
        await page.click('text=Contests');
        
        await page.waitForSelector('text=Manage Contests', { timeout: 5000 });
        console.log('Contests Manager modal opened. Clicking New Contest...');
        await page.click('text=New Contest');

        // Wait for Create Contest Modal
        await page.waitForSelector('text=Create New Contest', { timeout: 5000 });
        console.log('Create Contest modal opened. Filling in form...');

        // Fill out modal fields
        await page.getByLabel('Contest Title').fill('VIP Summer Pool Party Shoot Giveaway');
        await page.locator('textarea').fill(
            'Welcome to my first exclusive giveaway on PoDM! I will be hosting a fully private VIP photoshoot in Miami, and I am giving away one all-expenses-paid spot to my most dedicated supporter. Enter standardly, or activate weighted entries to get a bonus ticket for every $25 you spend on tips or direct messages!'
        );
        await page.getByLabel('Prize Details').fill('Miami VIP Photoshoot Experience & Travel Package');
        
        // Datetime-local inputs need a specific format
        await page.getByLabel('Start Date').fill('2026-06-01T12:00');
        await page.getByLabel('End Date').fill('2026-06-15T12:00');

        // Check "Weighted Entries"
        console.log('Activating Weighted Entries checkbox...');
        await page.locator('input#weighted').check();

        // Fill spend and entries factors
        const numberInputs = page.locator('input[type="number"]');
        await numberInputs.nth(0).fill('25');
        await numberInputs.nth(1).fill('1');

        await page.waitForTimeout(1500); // Wait for the modal elements to settle visually

        console.log('Taking high-resolution screenshot of actual Create Contest Modal...');
        await page.screenshot({ path: contestScreenshotPath });
        console.log(`✅ Saved Creator Contest mockup to ${contestScreenshotPath}`);

    } catch (e) {
        console.error('❌ Error during capture automation:', e);
    } finally {
        await browser.close();
        console.log('\n🏁 Capture automation finished.');
    }
})();
