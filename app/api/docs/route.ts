// app/api/docs/route.ts
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { docs_v1 } from 'googleapis';
import { GaxiosError } from 'gaxios';
import { OAuth2Client } from 'google-auth-library';

// We only need the StructuralElement type for our text extraction
type Schema$StructuralElement = docs_v1.Schema$StructuralElement;

// Only keep service account auth
const serviceAuth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'),
  scopes: ['https://www.googleapis.com/auth/documents.readonly']
});

// Helper function to extract text from doc
async function extractDocText(doc: docs_v1.Schema$Document): Promise<string> {
  let text = '';
  doc.body?.content?.forEach((item: Schema$StructuralElement) => {
    if (item.paragraph) {
      item.paragraph.elements?.forEach((element) => {
        if (element.textRun?.content) {
          text += element.textRun.content;
        }
      });
    }
  });
  return text;
}

export async function POST(request: Request) {
  try {
    const { docUrl } = await request.json();
    const docId = docUrl.match(/[-\w]{25,}/)?.[0];
    
    if (!docId) {
      return NextResponse.json({ error: 'Invalid doc URL' }, { status: 400 });
    }

    const auth = await serviceAuth.getClient();
    const docsService = google.docs({ 
      version: 'v1', 
      auth: auth as OAuth2Client 
    });
    
    const doc = await docsService.documents.get({ documentId: docId });
    const text = await extractDocText(doc.data);

    return NextResponse.json({
      title: doc.data.title,
      content: text,
    });

  } catch (error) {
    console.error('Error:', error);
    if (error instanceof GaxiosError && error.response?.status === 403) {
      return NextResponse.json({ 
        error: 'Access denied. Make sure the document is shared with the service account.' 
      }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch doc' }, { status: 500 });
  }
}