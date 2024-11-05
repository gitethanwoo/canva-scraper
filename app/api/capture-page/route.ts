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
  let browser;
  
  try {
    const { url, pageNumber } = await req.json();
    console.log(`Capturing page ${pageNumber}`);
    
    const sessionId = await createSession();
    const wsUrl = `wss://connect.browserbase.com?apiKey=${process.env.BROWSERBASE_API_KEY}&sessionId=${sessionId}`;
    browser = await chromium.connectOverCDP(wsUrl);
    const page = await browser.newPage();
    
    // Navigate directly to the specific page
    await page.goto(`${url}#${pageNumber}`);
    await page.waitForTimeout(2000); // Wait for page to stabilize

    const screenshot = await page.screenshot({ type: 'png' });
    const base64Image = screenshot.toString('base64');
    
    await browser.close();
    
    return NextResponse.json({ 
      pageNumber,
      base64Image
    });

  } catch (error) {
    await browser?.close().catch(console.error);
    console.error('Failed to capture page:', error);
    return NextResponse.json({ 
      error: 'Failed to capture page',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 