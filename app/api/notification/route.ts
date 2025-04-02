import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { handleTranscriptCompleted } from './handlers/recording-transcript';

// Types for Zoom webhook payloads
interface ZoomWebhookPayload {
  event: string;
  payload: {
    plainToken?: string;
    object?: {
      id: string;
      uuid: string;
      host_id: string;
      account_id: string;
      topic: string;
      type: number;
      start_time: string;
      timezone: string;
      host_email: string;
      duration: number;
      recording_count?: number;
      recording_files?: Array<{
        id: string;
        meeting_id: string;
        recording_start: string;
        recording_end: string;
        file_type: string;
        file_size: number;
        play_url: string;
        download_url: string;
        status: string;
        recording_type: string;
      }>;
    };
  };
  download_token?: string;
}

// Set timeout for webhook validation (Zoom requires response within 3 seconds)
export const maxDuration = 3;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Handle Zoom's webhook verification challenge
    if (body.event === 'endpoint.url_validation') {
      // Validate payload structure
      if (!body.payload?.plainToken) {
        console.error('Invalid validation payload structure');
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
      }

      const plainToken = body.payload.plainToken;
      const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
      
      if (!secret) {
        console.error('ZOOM_WEBHOOK_SECRET_TOKEN not configured');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }

      try {
        const hashForValidation = crypto
          .createHmac('sha256', secret)
          .update(plainToken)
          .digest('hex');

        return NextResponse.json({
          plainToken: plainToken,
          encryptedToken: hashForValidation,
        });
      } catch (cryptoError) {
        console.error('Crypto operation failed:', cryptoError);
        return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
      }
    }

    // Handle actual webhook events
    const payload = body as ZoomWebhookPayload;

    // Validate webhook payload structure
    if (!payload.event || !payload.payload) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // Handle different event types
    switch (payload.event) {
      case 'recording.transcript_completed':
        if (!payload.payload.object || !payload.payload.object.recording_files) {
          return NextResponse.json({ error: 'Invalid transcript payload or missing recording files' }, { status: 400 });
        }
        await handleTranscriptCompleted({ 
          object: {
            ...payload.payload.object,
            recording_files: payload.payload.object.recording_files
          }
        });
        break;
        
      default:
        console.log('Unhandled event type:', payload.event);
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
