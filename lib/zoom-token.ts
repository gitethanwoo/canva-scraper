import { supabase } from './supabase';

interface ZoomTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}


export async function storeZoomTokens(tokens: ZoomTokens, zoomUserId: string, email: string) {
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

  const { error } = await supabase
    .from('zoom_users')
    .upsert({
      zoom_user_id: zoomUserId,
      email: email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'zoom_user_id'
    });

  if (error) {
    console.error('Error storing tokens:', error);
    throw new Error('Failed to store tokens');
  }
}

export async function refreshAccessToken(zoomUserId: string): Promise<string> {
  // First get the current refresh token
  const { data: user, error: fetchError } = await supabase
    .from('zoom_users')
    .select('refresh_token')
    .eq('zoom_user_id', zoomUserId)
    .single();

  if (fetchError || !user) {
    throw new Error('Failed to fetch refresh token');
  }

  // Exchange refresh token for new access token
  const response = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(
        `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
      ).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: user.refresh_token
    })
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const tokens: ZoomTokens = await response.json();
  
  // Update tokens in database
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

  const { error: updateError } = await supabase
    .from('zoom_users')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token, // Zoom might give us a new refresh token
      token_expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('zoom_user_id', zoomUserId);

  if (updateError) {
    throw new Error('Failed to update tokens');
  }

  return tokens.access_token;
}

export async function getValidAccessToken(zoomUserId: string): Promise<string> {
  // Get current token info
  const { data: user, error } = await supabase
    .from('zoom_users')
    .select('access_token, token_expires_at')
    .eq('zoom_user_id', zoomUserId)
    .single();

  if (error || !user) {
    throw new Error('Failed to fetch token');
  }

  // Check if token is expired or will expire in the next 5 minutes
  const expiresAt = new Date(user.token_expires_at);
  const now = new Date();
  const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

  if (expiresAt.getTime() - now.getTime() < fiveMinutes) {
    // Token is expired or will expire soon, refresh it
    return refreshAccessToken(zoomUserId);
  }

  // Token is still valid
  return user.access_token;
} 