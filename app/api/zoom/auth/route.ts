import { NextResponse } from 'next/server';

// Use our own callback URL
const REDIRECT_URI = process.env.NODE_ENV === 'production'
  ? 'https://contextprojector.vercel.app/api/zoom/callback'
  : 'http://localhost:3000/api/zoom/callback';

export async function GET() {
  try {
    const clientId = process.env.ZOOM_CLIENT_ID;
    if (!clientId) {
      throw new Error('ZOOM_CLIENT_ID not configured');
    }

    // Generate a random state value for CSRF protection
    const state = Math.random().toString(36).substring(7);
    
    // Use marketplace URL
    const response = NextResponse.redirect(
      `https://zoom.us/oauth/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `state=${state}`
    );

    // Set state cookie with HTTP-only flag
    response.cookies.set('zoom_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600 // 1 hour
    });

    return response;
  } catch (error) {
    console.error('Error initiating Zoom OAuth:', error);
    return NextResponse.json({ error: 'Failed to initiate OAuth' }, { status: 500 });
  }
} 