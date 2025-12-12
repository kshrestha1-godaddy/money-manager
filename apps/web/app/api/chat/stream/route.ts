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

interface FinancialContext {
  markdownData: string;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
    transactionCount: number;
    period: string;
    currency: string;
  };
}

interface StreamEvent {
  event: "text" | "chat_output" | "error";
  data: string | { complete: boolean } | { error: string };
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
async function* streamTokens(messages: ChatMessage[], settings: ChatSettings, financialContext?: FinancialContext): AsyncGenerator<StreamEvent, void, unknown> {
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


  try {
    // Check for API key before proceeding
    if (!process.env.OPENAI_API_KEY) {
      yield { event: "error", data: { error: "OpenAI API key not configured" } };
      return;
    }

    // Convert conversation text to messages format
    const messages = validMessages.map(msg => ({
      role: msg.sender === "USER" ? "user" : "assistant",
      content: msg.content,
    }));

    // Add financial context as system message if provided
    if (financialContext) {
      const systemMessage = {
        role: "system" as const,
        content: `You are a seasoned financial expert, analyst, and advisor with 20+ years of experience in personal finance management, investment analysis, and financial planning. You have a CFA designation and specialize in helping individuals optimize their financial health.

              FINANCIAL DATA PROVIDED:
              ${financialContext.markdownData}

              EXECUTIVE SUMMARY:
              - Analysis Period: ${financialContext.summary.period}
              - Total Income: ${financialContext.summary.totalIncome} ${financialContext.summary.currency}
              - Total Expenses: ${financialContext.summary.totalExpenses} ${financialContext.summary.currency}
              - Net Cash Flow: ${financialContext.summary.netAmount} ${financialContext.summary.currency}
              - Transaction Volume: ${financialContext.summary.transactionCount} transactions

              ANALYSIS FRAMEWORK:
              As a financial expert, you must respond with the rigor and professionalism of a top-tier financial analyst. Your responses should be:

              1. **STRUCTURED & ORGANIZED**: Use clear headings, bullet points, and logical flow
              2. **ANALYTICAL & CRITICAL**: Identify patterns, anomalies, and areas of concern
              3. **DATA-DRIVEN**: Reference specific numbers, percentages, and trends from the data
              4. **ACTIONABLE**: Provide concrete, implementable recommendations
              5. **COMPREHENSIVE**: Consider both short-term and long-term implications

              RESPONSE REQUIREMENTS:
              ✅ Always start with an "Executive Summary" when analyzing overall performance
              ✅ Use financial terminology appropriately (cash flow, burn rate, expense ratios, etc.)
              ✅ Calculate and present key financial ratios and metrics
              ✅ Identify red flags, inefficiencies, and optimization opportunities
              ✅ Provide prioritized recommendations with expected impact
              ✅ Include risk assessments where relevant
              ✅ Reference specific transactions or categories when making points
              ✅ Use professional formatting with clear sections and subsections

              CRITICAL ANALYSIS AREAS TO EVALUATE:
              - Cash flow patterns and sustainability
              - Expense category analysis and benchmarking
              - Income diversification and stability
              - Spending efficiency and waste identification
              - Financial goal alignment
              - Emergency fund adequacy
              - Investment vs. spending allocation
              - Recurring expense optimization opportunities

              Approach every query with the analytical rigor of a financial consultant preparing a report for a high-net-worth client. Be thorough, insightful, and professionally critical in your analysis.`
      };
      
      // Insert system message at the beginning
      messages.unshift(systemMessage);
    }

    // Build API request with user settings
    const requestOptions: any = {
      model: settings.model || MODEL_NAME,
      messages: messages,
      stream: settings.stream,
      temperature: settings.temperature,
      max_tokens: settings.max_output_tokens,
      top_p: settings.top_p,
    };

    // Add optional parameters only if they have values
    if (settings.top_logprobs > 0) {
      requestOptions.logprobs = true;
      requestOptions.top_logprobs = settings.top_logprobs;
    }

    const client = getOpenAIClient();
    const stream = await client.chat.completions.create(requestOptions) as any;

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
    let body: { messages?: unknown; settings?: ChatSettings; financialContext?: FinancialContext };
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
          for await (const token of streamTokens(messages as ChatMessage[], apiSettings, financialContext)) {
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

