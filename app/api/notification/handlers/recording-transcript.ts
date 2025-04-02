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

export async function handleTranscriptCompleted(payload: TranscriptPayload, downloadToken: string) {
  try {
    const { object } = payload;
    
    // Log the webhook payload for debugging
    console.log('Received transcript webhook:', {
      meetingId: object.id,
      topic: object.topic,
      recordingFiles: object.recording_files.length
    });
    
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

    // Construct the download URL with the token
    const downloadUrl = `${transcriptFile.download_url}?access_token=${downloadToken}`;

    // Download the transcript
    console.log('Attempting to download transcript...');
    const response = await fetch(downloadUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${downloadToken}`
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