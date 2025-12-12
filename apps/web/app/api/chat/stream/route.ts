import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Async generator function that yields tokens one by one
async function* streamTokens(messages: any[]): AsyncGenerator<{ event: string; data: any }, void, unknown> {
  // Build conversation history for OpenAI
  const conversationText = messages
    .map((msg: any) => {
      const role = msg.sender === "USER" ? "User" : "Assistant";
      return `${role}: ${msg.content}`;
    })
    .join("\n\n");

  try {
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: conversationText,
      stream: true,
    });

    // Stream the response chunks token by token
    let chunkIndex = 0;
    console.log("[API] Starting to stream tokens from OpenAI...");
    
    for await (const chunk of response) {
      chunkIndex++;
      const chunkData = chunk as any;
      console.log(`[API] Received chunk #${chunkIndex} from OpenAI:`, JSON.stringify(chunkData).substring(0, 200));
      
      // Handle OpenAI responses API format
      // The stream has different event types, we need to extract text from response.output_text.delta
      if (chunkData.type === "response.output_text.delta") {
        const delta = chunkData.delta || "";
        if (delta) {
          console.log(`[API] Yielding text token (delta):`, delta);
          // Yield text token immediately
          yield { event: "text", data: delta };
        }
      } else if (chunkData.type === "response.output_text.done") {
        // Final text is available, but we've already streamed all deltas
        console.log("[API] Output text done");
      } else if (chunkData.type === "response.completed" || chunkData.type === "stream.complete") {
        // Stream is complete
        console.log("[API] Stream completed");
        break;
      }
    }
    
    console.log("[API] Stream complete, yielding chat_output event");

    // Yield final event to indicate completion
    yield { event: "chat_output", data: { complete: true } };
  } catch (error) {
    console.error("Error streaming OpenAI response:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to get response from OpenAI";
    yield { event: "error", data: { error: errorMessage } };
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response("Messages array is required", { status: 400 });
    }

    // Create a streaming response using the async generator
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Consume the async generator and send SSE events
          for await (const token of streamTokens(messages)) {
            console.log("[API] Generator yielded token:", token.event, "| Data:", typeof token.data === 'string' ? token.data.substring(0, 50) : token.data);
            const encoder = new TextEncoder();
            const eventData = `event: ${token.event}\ndata: ${JSON.stringify(token.data)}\n\n`;
            console.log("[API] Sending SSE event:", eventData.substring(0, 100));
            controller.enqueue(encoder.encode(eventData));
          }
          console.log("[API] Stream closed");
          controller.close();
        } catch (error) {
          console.error("Error in stream controller:", error);
          const encoder = new TextEncoder();
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "Stream error" })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in chat stream route:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

