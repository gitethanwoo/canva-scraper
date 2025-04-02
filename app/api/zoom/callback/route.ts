import { NextRequest, NextResponse } from 'next/server';
import { storeZoomTokens } from '@/lib/zoom-token';

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

  console.log('Attempting to exchange code for token with:', {
    clientId: clientId.substring(0, 5) + '...',
    redirectUri: REDIRECT_URI,
    codeLength: code.length
  });

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
    console.error('Token exchange failed:', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      error
    });
    throw new Error(`Failed to exchange code: ${error}`);
  }

  return tokenResponse.json();
}

async function getZoomUserInfo(accessToken: string): Promise<{ id: string; email: string }> {
  const response = await fetch('https://api.zoom.us/v2/users/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }

  const data = await response.json();
  return { id: data.id, email: data.email };
}

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://contextprojector.vercel.app'
    : 'http://localhost:3000';

  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Log all query parameters for debugging
    console.log('Received callback with params:', Object.fromEntries(searchParams.entries()));

    // Check for OAuth errors
    if (error) {
      console.error('Zoom OAuth error:', error, errorDescription);
      return NextResponse.redirect(`${baseUrl}/auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`);
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('Missing code or state');
      return NextResponse.redirect(`${baseUrl}/auth/error?error=missing_params`);
    }

    // Verify state matches cookie
    const storedState = req.cookies.get('zoom_oauth_state');
    if (!storedState || storedState.value !== state) {
      console.error('State mismatch:', {
        storedState: storedState?.value,
        receivedState: state
      });
      return NextResponse.redirect(`${baseUrl}/auth/error?error=invalid_state`);
    }

    // Exchange code for token
    const tokens = await exchangeCodeForToken(code);

    // Get user info
    const userInfo = await getZoomUserInfo(tokens.access_token);

    // Store tokens and user info
    await storeZoomTokens(tokens, userInfo.id, userInfo.email);

    console.log('Successfully stored tokens for user:', userInfo.email);

    // Clear the state cookie and redirect to success page
    const response = NextResponse.redirect(`${baseUrl}/auth/success`);
    response.cookies.delete('zoom_oauth_state');

    return response;
  } catch (error) {
    console.error('Error handling Zoom OAuth callback:', error);
    return NextResponse.redirect(`${baseUrl}/auth/error?error=server_error`);
  }
} 