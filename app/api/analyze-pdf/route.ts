import { NextResponse } from 'next/server';
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { PDFDocument } from 'pdf-lib';

async function createPdfFromImages(screenshots: { pageNumber: number; base64Image: string }[]) {
  const pdfDoc = await PDFDocument.create();
  
  for (const screenshot of screenshots.sort((a, b) => a.pageNumber - b.pageNumber)) {
    const img = await pdfDoc.embedPng(Buffer.from(screenshot.base64Image, 'base64'));
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    
    page.drawImage(img, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  return await pdfDoc.save();
}

export async function POST(req: Request) {
  try {
    const { screenshots } = await req.json();
    
    console.log('Creating PDF from screenshots...');
    const pdfBuffer = await createPdfFromImages(screenshots);
    
    console.log('Sending PDF to Claude for analysis...');
    const { text } = await generateText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please analyze this presentation and provide:
1. A concise executive summary
2. Key themes and messages
3. Notable insights or unique perspectives
4. Areas that could be improved or clarified
5. Overall assessment of effectiveness

Focus on both content and presentation style. Be terse. Act as though you're bringing someone up to speed. `,
            },
            {
              type: 'file',
              data: pdfBuffer,
              mimeType: 'application/pdf',
            },
          ],
        },
      ],
    });

    return NextResponse.json({ analysis: text });

  } catch (error) {
    console.error('Analysis failed:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze presentation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 