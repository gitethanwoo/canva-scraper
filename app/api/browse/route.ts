import { NextResponse } from 'next/server';
import { chromium } from 'playwright';

async function createSession() {
  const bb_api_key = process.env.BROWSERBASE_API_KEY!
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

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    const sessionId = await createSession();
    const wsUrl = `wss://connect.browserbase.com?apiKey=${process.env.BROWSERBASE_API_KEY}&sessionId=${sessionId}`;
    const browser = await chromium.connectOverCDP(wsUrl);
    const page = await browser.newPage();
    
    await page.goto(url);
    const screenshots = [];

    while (true) {
      // Take screenshot of current page
      const screenshot = await page.screenshot({ type: 'png' });
      screenshots.push(screenshot);

      // Check if next button is disabled
      const nextButton = await page.locator('button[aria-label="Next page"]');
      const isDisabled = await nextButton.getAttribute('aria-disabled') === 'true';
      
      if (isDisabled) {
        break;
      }

      // Click next button and wait for navigation
      await nextButton.click();
      await page.waitForTimeout(1000); // Wait for transition
    }

    await browser.close();

    // Return array of screenshots
    return NextResponse.json({ 
      screenshots: screenshots.map(screenshot => Buffer.from(screenshot).toString('base64'))
    });

  } catch (error) {
    console.error('Screenshot capture failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    
    return NextResponse.json({ 
      error: 'Failed to capture screenshot',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
