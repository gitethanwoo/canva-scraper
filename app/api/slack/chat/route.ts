import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifySlackRequest } from '@/lib/slack-utils';
import { createClient } from '@supabase/supabase-js';
import { WebClient } from '@slack/web-api';
import { extractUrls, isValidUrl } from '@/lib/url-utils';
import { captureScreenshot } from '@/lib/screenshot-utils';

// Replace Redis initialization with Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize Slack client 
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

interface SlackEvent {
  type: string;
  text?: string;
  channel?: string;
  user?: string;
  thread_ts?: string;
  bot_id?: string;
  subtype?: string;
  event_ts?: string;
  ts?: string;
  channel_type?: string;
}

interface SlackEventPayload {
  type: string;
  event?: SlackEvent;
  challenge?: string;
  token?: string;
}

interface MessageHistory {
  role: 'user' | 'assistant';
  content: string;
  images?: string[]; // Base64 encoded screenshots
}

interface SlackMention {
  type: 'app_mention';
  user: string;
  text: string;
  ts: string;
  channel: string;
  event_ts: string;
}

// Add this function to fetch channel history
async function getChannelHistory(channel: string, limit = 20): Promise<MessageHistory[]> {
  try {
    const result = await slack.conversations.history({
      channel,
      limit,
      inclusive: true
    });

    if (!result.ok || !result.messages) {
      console.error('Channel history fetch error:', result.error);
      return [];
    }

    // Filter and format messages
    return result.messages
      .filter(msg => msg.text && !msg.bot_id) // Only user messages with text
      .map(msg => ({
        role: 'user' as const, // Fix type inference
        content: msg.text || ''
      }))
      .reverse(); // Chronological order
  } catch (error) {
    console.error('Error fetching channel history:', error);
    return [];
  }
}

async function getThreadHistory(channel: string, thread_ts: string): Promise<MessageHistory[]> {
  try {
    console.log('Fetching thread history:', { channel, thread_ts });

    const result = await slack.conversations.replies({
      channel,
      ts: thread_ts,
      limit: 100,
      inclusive: true
    });

    console.log('Slack API Response:', result);

    if (!result.ok || !result.messages) {
      console.error('Slack API Error:', result.error);
      return [];
    }

    return result.messages
      .filter(msg => msg.text)
      .map(msg => ({
        role: msg.bot_id ? 'assistant' : 'user',
        content: msg.text || ''
      }));

  } catch (error) {
    console.error('Error fetching thread history:', error);
    return [];
  }
}

async function getConversationContext(
  channel: string,
  thread_ts?: string,
  isAppMention = false
): Promise<MessageHistory[]> {
  let context: MessageHistory[] = [];

  // If it's an @mention, get channel context first
  if (isAppMention) {
    const channelHistory = await getChannelHistory(channel);
    context = [...channelHistory];
    console.log('Added channel context:', channelHistory.length, 'messages');
  }

  // Then get thread context if it exists
  if (thread_ts) {
    const threadHistory = await getThreadHistory(channel, thread_ts);
    context = [...context, ...threadHistory];
    console.log('Added thread context:', threadHistory.length, 'messages');
  }

  return context;
}

function isAppMention(event: SlackEvent | SlackMention): boolean {
  return event.type === 'app_mention';
}

function isThreadedReply(event: SlackEvent): boolean {
  return !!event.thread_ts;
}

function isDirectMessage(event: SlackEvent): boolean {
  return event.channel_type === 'im';
}

// Replace Redis helper functions with Supabase versions
async function markThreadAsActive(channel: string, threadTs: string): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

  await supabase
    .from('slack_tracking')
    .insert({
      type: 'thread',
      identifier: threadTs,
      channel_id: channel,
      expires_at: expiresAt.toISOString()
    });
}

async function isThreadActive(channel: string, threadTs: string): Promise<boolean> {
  const { data } = await supabase
    .from('slack_tracking')
    .select('id')
    .eq('type', 'thread')
    .eq('identifier', threadTs)
    .eq('channel_id', channel)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  return !!data;
}

// Replace message deduplication logic
async function checkAndMarkMessageProcessed(messageId: string): Promise<boolean> {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minute expiry

  // First check if message exists
  const { data: existing } = await supabase
    .from('slack_tracking')
    .select('id')
    .eq('type', 'message')
    .eq('identifier', messageId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (existing) {
    return true; // Message already processed
  }

  // Mark message as processed
  await supabase
    .from('slack_tracking')
    .insert({
      type: 'message',
      identifier: messageId,
      expires_at: expiresAt.toISOString()
    });

  return false;
}

// Update shouldRespondToMessage to be async and check thread activity
async function shouldRespondToMessage(event: SlackEvent): Promise<boolean> {
  // Always respond to DMs
  if (isDirectMessage(event)) {
    return true;
  }

  // Always respond to @mentions and activate the thread
  if (isAppMention(event)) {
    if (event.thread_ts) {
      await markThreadAsActive(event.channel!, event.thread_ts);
    } else {
      await markThreadAsActive(event.channel!, event.ts!);
    }
    return true;
  }

  // For thread replies, check if we're active in the thread
  if (isThreadedReply(event)) {
    return await isThreadActive(event.channel!, event.thread_ts!);
  }

  return false;
}

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const timestamp = headersList.get('x-slack-request-timestamp');
    const signature = headersList.get('x-slack-signature');

    const rawBody = await req.text();
    const body = JSON.parse(rawBody) as SlackEventPayload;

    // Handle URL verification without signature check
    if (body.type === 'url_verification') {
      console.log('Handling URL verification:', body.challenge);
      return new Response(JSON.stringify({ challenge: body.challenge }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify other requests from Slack
    const isValid = await verifySlackRequest({
      timestamp: timestamp || '',
      signature: signature || '',
      rawBody
    });

    if (!isValid) {
      console.log('Invalid Slack request');
      return NextResponse.json({ error: 'Invalid request' }, { status: 401 });
    }

    // Handle messages
    if (body.type === 'event_callback' && body.event) {
      // Add detailed logging for message type
      console.log('Event type detection:', {
        isAppMention: isAppMention(body.event),
        isThreadedReply: isThreadedReply(body.event),
        isDirectMessage: isDirectMessage(body.event),
        eventType: body.event.type,
        channelType: body.event.channel_type,
        hasThreadTs: !!body.event.thread_ts,
        text: body.event.text?.slice(0, 50), // First 50 chars for logging
      });

      // Early return if we shouldn't respond
      const shouldRespond = await shouldRespondToMessage(body.event);
      if (!shouldRespond) {
        console.log('Ignoring message - does not meet response criteria');
        return NextResponse.json({ ok: true });
      }

      // Ignore bot messages, message updates, and verify channel access
      if (body.event.bot_id ||
        body.event.subtype ||
        !body.event.channel) {
        return NextResponse.json({ ok: true });
      }

      const threadTs = body.event.thread_ts ?? body.event.ts;
      console.log('Thread context:', {
        eventTs: body.event.ts,
        threadTs: body.event.thread_ts,
        finalThreadTs: threadTs,
        isThreadedReply: !!body.event.thread_ts
      });

      const messageId = body.event.event_ts || body.event.ts;
      if (!messageId) {
        console.log('No valid message ID found, skipping message');
        return NextResponse.json({ ok: true });
      }

      const isDuplicate = await checkAndMarkMessageProcessed(messageId);
      if (isDuplicate) {
        console.log('Skipping duplicate message:', messageId);
        return NextResponse.json({ ok: true });
      }

      try {
        console.log('Processing user message:', body.event.text);


        // Get conversation context
        const messageHistory = await getConversationContext(
          body.event.channel!,
          body.event.thread_ts ?? body.event.ts,
          isAppMention(body.event)
        );
        console.log('Thread history being sent to chat API:', messageHistory);

        let enhancedMessage = body.event.text || '';
        const screenshots: string[] = [];

        // Extract and process URLs
        const urls = extractUrls(body.event.text || '');
        if (urls.length > 0) {
          console.log('Found URLs to process:', urls);

          for (const url of urls) {
            if (isValidUrl(url)) {
              try {
                const screenshot = await captureScreenshot(url);
                if (screenshot) {
                  screenshots.push(screenshot);
                  enhancedMessage += `\n[Screenshot of ${url} processed]`;
                }
              } catch (error) {
                console.error(`Failed to capture screenshot for ${url}:`, error);
              }
            }
          }
        }

        console.log('Sending to chat API with screenshots:', {
          messageLength: enhancedMessage.length,
          numberOfScreenshots: screenshots.length,
          screenshotSizes: screenshots.map(s => s.length)
        });

        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-slack-request-timestamp': '1'
          },
          body: JSON.stringify({
            messages: [
              ...messageHistory,
              {
                role: 'user',
                content: enhancedMessage,
                images: screenshots
              }
            ],
          })
        });

        if (!response.ok) {
          console.error('Chat API error:', await response.text());
          throw new Error('Chat API failed');
        }

        const data = await response.json();
        console.log('Chat API response content:', data.content);

        // Send message back to Slack using the WebClient
        await slack.chat.postMessage({
          channel: body.event.channel!,
          text: data.content,
          // If it's an @mention without thread_ts, create a new thread using the original message ts
          thread_ts: body.event.thread_ts || (isAppMention(body.event) ? body.event.ts : undefined),
          mrkdwn: true,
          unfurl_links: false
        });

        return NextResponse.json({ ok: true });
      } catch (error) {
        console.error('Error processing Slack message:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in Slack route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
