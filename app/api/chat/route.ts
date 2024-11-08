import { openai } from "@ai-sdk/openai";
import { generateText, convertToCoreMessages } from "ai";
import { z } from "zod";

// Add type safety for request body
const RequestSchema = z.object({
  messages: z.array(
    z.object({
      content: z.string(),
      role: z.enum(["user", "assistant", "system"]),
      images: z.array(z.string()).optional(),
    })
  ),
});

const SYSTEM_PROMPT = `you are a helpful slack bot. answer questions like a very smart professor. 
When analyzing screenshots or images, describe what you see and provide relevant insights.`;

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = RequestSchema.parse(body);

    console.log(`Processing chat with ${messages.length} messages`);
    console.log('Messages content:', messages.map(m => ({
      role: m.role,
      contentLength: m.content.length,
      hasImages: !!m.images?.length,
      imageCount: m.images?.length
    })));

    // Prepare messages with image context
    const enhancedMessages = messages.map(msg => {
      if (msg.images?.length) {
        return {
          ...msg,
          content: `${msg.content}\n\nImage Analysis: [Processing ${msg.images.length} screenshots attached to this message]`
        };
      }
      return msg;
    });

    console.log('Sending to OpenAI with enhanced messages:', enhancedMessages);

    const result = await generateText({
      model: openai("gpt-4o-2024-08-06"),
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        ...convertToCoreMessages(enhancedMessages),
      ],
    });

    console.log('OpenAI response:', {
      text: result.text?.slice(0, 100) + '...',  // Log first 100 chars
      fullLength: result.text?.length
    });

    return Response.json({ content: result.text });
  } catch (error) {
    console.error("Chat API error:", error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return Response.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
