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

interface ChatSettings {
  model: string;
  temperature: number;
  max_output_tokens: number;
  top_p: number;
  stream: boolean;
  parallel_tool_calls: boolean;
  store: boolean;
  reasoning: boolean;
  truncation: 'auto' | 'disabled';
  top_logprobs: number;
  safety_identifier?: string;
  service_tier: 'auto' | 'default' | 'flex' | 'priority';
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
async function* streamTokens(messages: ChatMessage[], settings: ChatSettings): AsyncGenerator<StreamEvent, void, unknown> {
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
    // Build API request with user settings
    const requestOptions: any = {
      model: settings.model || MODEL_NAME,
      input: conversationText,
      stream: settings.stream,
      temperature: settings.temperature,
      max_output_tokens: settings.max_output_tokens,
      top_p: settings.top_p,
      parallel_tool_calls: settings.parallel_tool_calls,
      store: settings.store,
      truncation: settings.truncation,
      service_tier: settings.service_tier,
    };

    // Add optional parameters only if they have values
    if (settings.top_logprobs > 0) {
      requestOptions.top_logprobs = settings.top_logprobs;
    }

    if (settings.safety_identifier) {
      requestOptions.safety_identifier = settings.safety_identifier;
    }

    if (settings.reasoning) {
      requestOptions.reasoning = { enabled: true };
    }

    const response = await client.responses.create(requestOptions);

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
    let body: { messages?: unknown; settings?: ChatSettings };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const { messages, settings } = body;
    
    // Use default settings if not provided
    const defaultSettings: ChatSettings = {
      model: MODEL_NAME,
      temperature: 1,
      max_output_tokens: 4096,
      top_p: 1,
      stream: true,
      parallel_tool_calls: true,
      store: false,
      reasoning: false,
      truncation: 'auto',
      top_logprobs: 0,
      service_tier: 'auto',
    };

    const apiSettings = { ...defaultSettings, ...settings };
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
          for await (const token of streamTokens(messages as ChatMessage[], apiSettings)) {
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

