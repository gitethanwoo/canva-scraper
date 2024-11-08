import { chromium } from 'playwright';

async function createBrowserbaseSession() {
  const bb_api_key = process.env.BROWSERBASE_API_KEY!;
  try {
    const response = await fetch(`https://www.browserbase.com/v1/sessions`, {
      method: "POST",
      headers: {
        "x-bb-api-key": bb_api_key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ projectId: process.env.BROWSERBASE_PROJECT_ID }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to create session: ${errorData}`);
    }

    const data = await response.json();
    if (!data.id) {
      throw new Error('No session ID returned from BrowserBase');
    }

    return data.id;
  } catch (error) {
    console.error('Session creation failed:', error);
    throw error;
  }
}

export async function captureScreenshot(url: string): Promise<string | null> {
  let browser;
  try {
    const sessionId = await createBrowserbaseSession();
    const wsUrl = `wss://connect.browserbase.com?apiKey=${process.env.BROWSERBASE_API_KEY}&sessionId=${sessionId}`;
    
    browser = await chromium.connectOverCDP(wsUrl);
    const page = await browser.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Wait for page to stabilize
    
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
    await browser?.close().catch(console.error);
  }
} 