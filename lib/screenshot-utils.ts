import { chromium } from 'playwright';

export async function captureScreenshot(url: string): Promise<string | null> {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Wait for the content to be reasonably loaded
    await page.waitForLoadState('domcontentloaded');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Capture screenshot as base64
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 80,
      fullPage: true,
    });
    
    return screenshot.toString('base64');
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    return null;
  } finally {
    await browser.close();
  }
} 