import { chromium } from 'playwright';

async function createBrowserbaseSession() {
  const bb_api_key = process.env.BROWSERBASE_API_KEY!;
  console.log('Creating Browserbase session...');
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
      console.error('Browserbase session creation failed:', errorData);
      throw new Error(`Failed to create session: ${errorData}`);
    }

    const data = await response.json();
    if (!data.id) {
      throw new Error('No session ID returned from BrowserBase');
    }

    console.log('Successfully created Browserbase session:', data.id);
    return data.id;
  } catch (error) {
    console.error('Session creation failed:', error);
    throw error;
  }
}

export async function captureScreenshot(url: string): Promise<string | null> {
  let browser;
  console.log('Starting screenshot capture for URL:', url);
  
  try {
    const sessionId = await createBrowserbaseSession();
    const wsUrl = `wss://connect.browserbase.com?apiKey=${process.env.BROWSERBASE_API_KEY}&sessionId=${sessionId}`;
    console.log('Connecting to Browserbase websocket...');
    
    browser = await chromium.connectOverCDP(wsUrl);
    console.log('Browser connected successfully');
    
    const page = await browser.newPage();
    console.log('New page created');
    
    console.log('Navigating to URL:', url);
    await page.goto(url, { waitUntil: 'networkidle' });
    console.log('Page loaded, waiting for stability...');
    
    await page.waitForTimeout(2000);
    
    console.log('Taking screenshot...');
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 80,
      fullPage: true,
    });
    
    const base64String = screenshot.toString('base64');
    console.log('Screenshot captured successfully, base64 length:', base64String.length);
    
    return base64String;
  } catch (error) {
    console.error('Screenshot capture failed with error:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return null;
  } finally {
    if (browser) {
      console.log('Closing browser connection...');
      await browser.close().catch(err => {
        console.error('Error closing browser:', err);
      });
      console.log('Browser connection closed');
    }
  }
} 