import { NextResponse } from 'next/server';
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export async function POST(request: Request) {
  try {
    const { question, context } = await request.json();

    const { text } = await generateText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Context from Google Doc:\n${context}\n\nQuestion: ${question}\n\nPlease provide a clear and concise answer based on the context provided.`,
            }
          ],
        },
      ],
    });

    return NextResponse.json({ answer: text });

  } catch (error) {
    console.error('Analysis failed:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 