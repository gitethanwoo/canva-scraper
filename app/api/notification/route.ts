import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Types for Zoom webhook payloads
interface ZoomWebhookPayload {
  event: string;
  payload: {
    object: {
      id: string;
      host_id: string;
      topic: string;
      type: number;
      start_time: string;
      duration: number;
      timezone: string;
    };
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Handle Zoom's webhook verification challenge
    if (body.event === 'endpoint.url_validation') {
      const plainToken = body.payload.plainToken;
      const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
      
      if (!secret) {
        console.error('ZOOM_WEBHOOK_SECRET_TOKEN not configured');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }

      const hashForValidation = crypto
        .createHmac('sha256', secret)
        .update(plainToken)
        .digest('hex');

      return NextResponse.json({
        plainToken: body.payload.plainToken,
        encryptedToken: hashForValidation,
      });
    }

    // Handle actual webhook events
    const payload = body as ZoomWebhookPayload;

    // For now, just log the event
    console.log('Received Zoom webhook:', payload.event);
    
    // You can add specific handling for meeting.ended event here
    if (payload.event === 'meeting.ended') {
      // Handle meeting end event
      console.log('Meeting ended:', payload.payload.object);
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
