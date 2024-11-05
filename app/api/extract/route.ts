import { NextResponse } from 'next/server';
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai"

export async function POST(req: Request) {
  try {
    const { screenshots } = await req.json();
    
    console.log(`Starting text extraction for ${screenshots.length} images`);
    
    const extractionPromises = screenshots.map(async (screenshot: { pageNumber: number; base64Image: string }) => {
      try {
        const { text } = await generateText({
          model: openai('gpt-4o-2024-08-06'),
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'This is a slide from a Servant (faith tech consulting company) presentation. Please provide a very thorough summary of what this slide is about and what it communicates. Focus on capturing the key messages, main points, and any important details, even if some text is partially visible. Your summary should help reconstruct the full narrative of the presentation when combined with other slides. Do not include any other commentary, and use as much detail as needed to fully capture the content of the slide. ' },
                { type: 'image', image: screenshot.base64Image },
              ],
            },
          ],
        });

        return {
          pageNumber: screenshot.pageNumber,
          text,
        };
      } catch (error) {
        console.error(`Extraction failed for page ${screenshot.pageNumber}:`, error);
        return {
          pageNumber: screenshot.pageNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    const results = await Promise.all(extractionPromises);
    return NextResponse.json({ results });

  } catch (error) {
    console.error('Text extraction failed:', error);
    return NextResponse.json({ 
      error: 'Failed to extract text',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 