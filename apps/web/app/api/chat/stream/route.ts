import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import OpenAI from "openai";

// Configuration
const MODEL_NAME = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MAX_MESSAGES = parseInt(process.env.MAX_CHAT_MESSAGES || "50");

// Type definitions
interface ChatMessage {
  sender: "USER" | "ASSISTANT";
  content: string;
}

interface StreamEvent {
  event: "text" | "chat_output" | "error";
  data: string | { complete: boolean } | { error: string };
}

interface OpenAIChunk {
  type: string;
  delta?: string;
}

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Optimized async generator for token streaming
async function* streamTokens(messages: ChatMessage[]): AsyncGenerator<StreamEvent, void, unknown> {
  // Validate and limit message history
  const validMessages = messages
    .filter((msg): msg is ChatMessage => 
      msg && typeof msg.content === 'string' && msg.content.trim() !== '' &&
      (msg.sender === "USER" || msg.sender === "ASSISTANT")
    )
    .slice(-MAX_MESSAGES);

  if (validMessages.length === 0) {
    yield { event: "error", data: { error: "No valid messages provided" } };
    return;
  }

  // Build optimized conversation text
  const conversationText = validMessages
    .map(msg => `${msg.sender === "USER" ? "User" : "Assistant"}: ${msg.content}`)
    .join("\n\n");

  try {
    const response = await client.responses.create({
      model: MODEL_NAME,
      input: conversationText,
      stream: true,
    });

    // Process stream chunks efficiently
    for await (const chunk of response) {
      const chunkData = chunk as OpenAIChunk;
      
      // Extract and yield text deltas
      if (chunkData.type === "response.output_text.delta" && chunkData.delta) {
        yield { event: "text", data: chunkData.delta };
      } 
      // Handle completion events
      else if (chunkData.type === "response.completed" || chunkData.type === "stream.complete") {
        break;
      }
    }

    // Signal completion
    yield { event: "chat_output", data: { complete: true } };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "OpenAI API error";
    yield { event: "error", data: { error: errorMessage } };
  }
}

// Optimized POST handler
export async function POST(req: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // Parse and validate request body
    let body: { messages?: unknown };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const { messages } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Valid messages array is required" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // Create optimized streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          const eventData = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(eventData));
        };

        try {
          // Stream tokens efficiently
          for await (const token of streamTokens(messages as ChatMessage[])) {
            sendEvent(token.event, token.data);
          }
          controller.close();
        } catch (error) {
          // Send error event and close stream
          sendEvent("error", { error: "Streaming failed" });
          controller.close();
        }
      },
    });

    // Return streaming response with optimal headers
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
    
  } catch (error) {
    // Log error for debugging (only in development)
    if (process.env.NODE_ENV === "development") {
      console.error("Chat stream error:", error);
    }
    
    return new Response(JSON.stringify({ error: "Internal server error" }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}

