import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import OpenAI from "openai";
import { generateDefaultSystemPrompt, generateFinancialSystemPrompt } from "../../../lib/chat/prompts";
import { ChatSettings, FinancialContext } from "../../../(dashboard)/chat/types/chat";

// Configuration
const MODEL_NAME = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MAX_MESSAGES = parseInt(process.env.MAX_CHAT_MESSAGES || "50");

interface ChatRequestMessage {
  sender: "USER" | "ASSISTANT";
  content: string;
}

interface StreamEvent {
  event: "text" | "done" | "error";
  data: string | { ok: true } | { error: string };
}

// Lazy initialize OpenAI client to avoid build-time issues
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }
  
  return new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
}

// Optimized async generator for token streaming
async function* streamTokens(
  requestMessages: ChatRequestMessage[],
  settings: ChatSettings,
  financialContext?: FinancialContext
): AsyncGenerator<StreamEvent, void, unknown> {
  // Validate and limit message history
  const validMessages = requestMessages
    .filter((msg): msg is ChatRequestMessage =>
      msg &&
      typeof msg.content === "string" &&
      msg.content.trim() !== "" &&
      (msg.sender === "USER" || msg.sender === "ASSISTANT")
    )
    .slice(-MAX_MESSAGES);

  if (validMessages.length === 0) {
    yield { event: "error", data: { error: "No valid messages provided" } };
    return;
  }

  try {
    // Check for API key before proceeding
    if (!process.env.OPENAI_API_KEY) {
      yield { event: "error", data: { error: "OpenAI API key not configured" } };
      return;
    }

    const systemPrompt = financialContext
      ? generateFinancialSystemPrompt(financialContext)
      : generateDefaultSystemPrompt();

    // Convert conversation to OpenAI messages format
    const openAiMessages = [
      { role: "system" as const, content: systemPrompt },
      ...validMessages.map((msg) => ({
      role: msg.sender === "USER" ? "user" : "assistant",
      content: msg.content,
      })),
    ];

    // Build API request with user settings
    const requestOptions: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
      model: settings.model || MODEL_NAME,
      messages: openAiMessages,
      stream: true,
      temperature: settings.temperature,
      max_tokens: settings.max_output_tokens,
      top_p: settings.top_p,
    };

    // Add optional parameters only if they have values
    if (settings.top_logprobs > 0) {
      (requestOptions as any).logprobs = true;
      (requestOptions as any).top_logprobs = settings.top_logprobs;
    }

    const client = getOpenAIClient();
    const stream = await client.chat.completions.create(requestOptions);

    // Process stream chunks efficiently
    for await (const chunk of stream) {
      // Extract and yield text deltas from chat completions
      if (chunk.choices?.[0]?.delta?.content) {
        yield { event: "text", data: chunk.choices[0].delta.content };
      } 
      
      // Handle completion events
      if (chunk.choices?.[0]?.finish_reason) {
        break;
      }
    }

    // Signal completion
    yield { event: "done", data: { ok: true } };
    
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
    let body: { messages?: unknown; settings?: Partial<ChatSettings>; financialContext?: FinancialContext };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const { messages, settings, financialContext } = body;
    
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
      safety_identifier: "",
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
          for await (const token of streamTokens(messages as ChatRequestMessage[], apiSettings, financialContext)) {
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

