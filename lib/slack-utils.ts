import { createHmac } from 'crypto';

interface VerifySlackRequestParams {
  timestamp: string;
  signature: string;
  rawBody: string;
}

export async function verifySlackRequest({
  timestamp,
  signature,
  rawBody
}: VerifySlackRequestParams): Promise<boolean> {
  const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
  
  if (!SLACK_SIGNING_SECRET) {
    throw new Error('SLACK_SIGNING_SECRET is not set');
  }

  // Verify timestamp is within 5 minutes
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    return false;
  }

  const sigBasestring = `v0:${timestamp}:${rawBody}`;
  const mySignature = `v0=${createHmac('sha256', SLACK_SIGNING_SECRET)
    .update(sigBasestring)
    .digest('hex')}`;

  return signature === mySignature;
}
