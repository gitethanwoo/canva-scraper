import { NextRequest, NextResponse } from 'next/server';

// Use the same redirect URI as auth route
const REDIRECT_URI = process.env.NODE_ENV === 'production'
  ? 'https://contextprojector.vercel.app/api/zoom/callback'
  : 'http://localhost:3000/api/zoom/callback';

async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Missing Zoom OAuth credentials');
  }

  const tokenResponse = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI
    })
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  return tokenResponse.json();
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      console.error('Zoom OAuth error:', error);
      return NextResponse.redirect('/auth/error?error=' + encodeURIComponent(error));
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('Missing code or state');
      return NextResponse.redirect('/auth/error?error=missing_params');
    }

    // Verify state matches cookie
    const storedState = req.cookies.get('zoom_oauth_state');
    if (!storedState || storedState.value !== state) {
      console.error('State mismatch');
      return NextResponse.redirect('/auth/error?error=invalid_state');
    }

    // Exchange code for token
    const tokens = await exchangeCodeForToken(code);

    // For now, just log the tokens (we'll implement storage next)
    console.log('Received tokens:', {
      access_token: tokens.access_token.substring(0, 10) + '...',
      expires_in: tokens.expires_in,
      refresh_token: tokens.refresh_token.substring(0, 10) + '...'
    });

    // Clear the state cookie and redirect to success page
    const response = NextResponse.redirect('/auth/success');
    response.cookies.delete('zoom_oauth_state');

    return response;
  } catch (error) {
    console.error('Error handling Zoom OAuth callback:', error);
    return NextResponse.redirect('/auth/error?error=' + encodeURIComponent('server_error'));
  }
} 