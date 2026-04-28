const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173/login');
  await page.waitForTimeout(600);
  await page.fill('input[autocomplete="username"]', 'user');
  await page.fill('input[autocomplete="current-password"]', 'MoodFlow@2026Chen');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/chat', { timeout: 10000 });
  await page.waitForTimeout(2000);
  // Capture just the right panel (report panel) area
  const element = await page.locator('.insight-panel').first();
  await element.screenshot({ path: 'screenshots/fix-score-ring.png' });
  console.log('✓ fix-score-ring.png');
  await browser.close();
})();
