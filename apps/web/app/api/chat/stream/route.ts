import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import OpenAI from "openai";
import { generateDefaultSystemPrompt, generateFinancialSystemPrompt } from "../../../lib/chat/prompts";
import { DEFAULT_CHAT_SETTINGS, type FinancialContext } from "../../../(dashboard)/chat/types/chat";
import { readJsonObject } from "../../../lib/api-json";

// Configuration
const MODEL_NAME = process.env.OPENAI_MODEL || "gpt-4o-mini";
const configuredMessageLimit = Number(process.env.MAX_CHAT_MESSAGES);
const MAX_MESSAGES = Number.isSafeInteger(configuredMessageLimit) && configuredMessageLimit > 0
  ? configuredMessageLimit
  : 50;

interface ChatRequestMessage {
  sender: "USER" | "ASSISTANT";
  content: string;
}

interface StreamEvent {
  event: "text" | "done" | "error";
  data: string | { ok: true } | { error: string };
}

function isChatMessage(message: unknown): message is ChatRequestMessage {
  if (!message || typeof message !== "object") return false;
  return "content" in message &&
    typeof message.content === "string" &&
    message.content.trim() !== "" &&
    "sender" in message &&
    (message.sender === "USER" || message.sender === "ASSISTANT");
}

async function* streamTokens(
  messages: ChatRequestMessage[],
  options: Omit<OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming, "messages">,
  signal: AbortSignal,
  financialContext?: Pick<FinancialContext, "markdownData">
): AsyncGenerator<StreamEvent, void, unknown> {
  try {
    const systemPrompt = financialContext
      ? generateFinancialSystemPrompt(financialContext)
      : generateDefaultSystemPrompt();

    const client = new OpenAI();
    const stream = await client.chat.completions.create({
      ...options,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((message) => ({
          role: message.sender === "USER" ? "user" as const : "assistant" as const,
          content: message.content,
        })),
      ],
    }, { signal });

    for await (const chunk of stream) {
      if (chunk.choices?.[0]?.delta?.content) {
        yield { event: "text", data: chunk.choices[0].delta.content };
      } 
      
      if (chunk.choices?.[0]?.finish_reason) {
        break;
      }
    }

    yield { event: "done", data: { ok: true } };
    
  } catch (error) {
    if (!signal.aborted) {
      console.error("OpenAI chat request failed:", error);
      yield { event: "error", data: { error: "Chat request failed" } };
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await readJsonObject(request);
    const messages = Array.isArray(body?.messages)
      ? body.messages.filter(isChatMessage).slice(-MAX_MESSAGES)
      : [];
    if (!body || !messages.length) {
      return Response.json({ error: "Valid messages array is required" }, { status: 400 });
    }

    const { settings, financialContext } = body;
    if (settings != null && (typeof settings !== "object" || Array.isArray(settings))) {
      return Response.json({ error: "Invalid chat settings" }, { status: 400 });
    }
    const markdownData = financialContext && typeof financialContext === "object" &&
      "markdownData" in financialContext ? financialContext.markdownData : undefined;
    if (financialContext != null && typeof markdownData !== "string") {
      return Response.json({ error: "Invalid financial context" }, { status: 400 });
    }

    const {
      model,
      temperature,
      top_p,
      max_output_tokens,
      top_logprobs,
      service_tier,
    } = { ...DEFAULT_CHAT_SETTINGS, model: MODEL_NAME, ...settings };
    if (typeof model !== "string" || !model.trim() ||
        !Number.isFinite(temperature) || temperature < 0 || temperature > 2 ||
        !Number.isFinite(top_p) || top_p < 0 || top_p > 1 ||
        !Number.isInteger(max_output_tokens) || max_output_tokens < 1 || max_output_tokens > 8192 ||
        !Number.isInteger(top_logprobs) || top_logprobs < 0 || top_logprobs > 20 ||
        !["auto", "default", "flex", "priority"].includes(service_tier)) {
      return Response.json({ error: "Invalid chat settings" }, { status: 400 });
    }

    const abortController = new AbortController();
    const signal = AbortSignal.any([request.signal, abortController.signal]);
    const tokens = streamTokens(messages, {
      model,
      stream: true,
      store: false,
      temperature,
      top_p,
      max_tokens: max_output_tokens,
      logprobs: top_logprobs > 0,
      top_logprobs: top_logprobs || undefined,
      service_tier,
    }, signal, typeof markdownData === "string" ? { markdownData } : undefined);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async pull(controller) {
        const result = await tokens.next();
        if (abortController.signal.aborted) return;
        if (result.done || signal.aborted) {
          controller.close();
          await tokens.return();
          return;
        }

        const { event, data } = result.value;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      },
      async cancel() {
        abortController.abort();
        await tokens.return();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Chat stream error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
