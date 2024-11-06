import { openai } from "@ai-sdk/openai";
import { generateText, convertToCoreMessages } from "ai";
import { z } from "zod";

// Add type safety for request body
const RequestSchema = z.object({
  messages: z.array(
    z.object({
      content: z.string(),
      role: z.enum(["user", "assistant", "system"]),
    })
  ),
});

const SYSTEM_PROMPT = `you are a helpful slack bot. answer questions like a very smart professor.`;

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = RequestSchema.parse(body);

    console.log(`Processing chat with ${messages.length} messages`);

    const result = await generateText({
      model: openai("gpt-4o-2024-08-06"),
      messages: [
        {
          role: "system",
          content: `${SYSTEM_PROMPT}`,
        },
        ...convertToCoreMessages(messages),
      ],
    });

    return Response.json({ content: result.text });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
