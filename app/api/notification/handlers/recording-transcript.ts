interface TranscriptFile {
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
}

interface TranscriptPayload {
  object: {
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
    recording_files: TranscriptFile[];
  };
}

// You'll need to implement this based on your storage solution
async function getAccessToken(accountId: string): Promise<string | null> {
  // TODO: Retrieve the access token for this account from your storage
  console.log('Getting access token for account:', accountId);
  return null; // Replace with actual token retrieval
}

export async function handleTranscriptCompleted(payload: TranscriptPayload) {
  try {
    const { object } = payload;
    
    // Log the webhook payload for debugging
    console.log('Received transcript webhook:', {
      meetingId: object.id,
      topic: object.topic,
      accountId: object.account_id,
      recordingFiles: object.recording_files.length
    });

    // Get the OAuth token for this account
    const accessToken = await getAccessToken(object.account_id);
    if (!accessToken) {
      console.error('No access token found for account:', object.account_id);
      throw new Error('Account not authorized');
    }
    
    // Find the transcript file
    const transcriptFile = object.recording_files.find(
      file => file.recording_type === 'audio_transcript'
    );

    if (!transcriptFile) {
      console.error('No transcript file found in payload');
      return;
    }

    console.log('Found transcript file:', {
      fileId: transcriptFile.id,
      meetingId: transcriptFile.meeting_id,
      fileType: transcriptFile.file_type,
      fileSize: transcriptFile.file_size
    });

    // Construct the download URL
    const downloadUrl = transcriptFile.download_url;

    // Download the transcript using OAuth token
    console.log('Attempting to download transcript...');
    const response = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download transcript: ${response.statusText}`);
    }

    const transcript = await response.text();
    
    // Log the transcript content
    console.log('\n=== Transcript Content ===\n');
    console.log(transcript);
    console.log('\n=== End Transcript ===\n');
    
  } catch (error) {
    console.error('Error handling transcript completed event:', error);
    throw error;
  }
} 