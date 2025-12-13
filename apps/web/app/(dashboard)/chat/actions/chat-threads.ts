"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import prisma from "@repo/db/client";
import { revalidatePath } from "next/cache";
import { getUserIdFromSession } from "../../../utils/auth";
import { Prisma } from "@prisma/client";
type ChatSender = "USER" | "ASSISTANT";
type ChatMessageType = "TEXT" | "IMAGE" | "FILE" | "SYSTEM" | "ERROR";

export interface CreateThreadData {
  title?: string;
  description?: string;
}

export interface CreateConversationData {
  threadId: number;
  content: string;
  sender: ChatSender;
  messageType?: ChatMessageType;
  isProcessing?: boolean;
  feedback?: "LIKE" | "DISLIKE" | null;
  comments?: string;
  responseTimeSeconds?: number;
  tokenCount?: number;
  inputTokens?: number;
  outputTokens?: number;
  intermediateSteps?: unknown;
  systemPrompt?: unknown;
}

export interface UpdateConversationData {
  content?: string;
  messageType?: ChatMessageType;
  isProcessing?: boolean;
  feedback?: "LIKE" | "DISLIKE" | null;
  comments?: string;
  responseTimeSeconds?: number;
  tokenCount?: number;
  inputTokens?: number;
  outputTokens?: number;
  intermediateSteps?: unknown;
  systemPrompt?: unknown;
}

async function requireUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return getUserIdFromSession(session.user.id);
}

// Get all chat threads for the current user
export async function getChatThreads() {
  try {
    const userId = await requireUserId();

    const threads = await prisma.chatThread.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        conversations: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            content: true,
            sender: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            conversations: true,
          },
        },
      },
      orderBy: [
        { isPinned: "desc" },
        { lastMessageAt: "desc" },
      ],
    });

    return { success: true, threads };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    console.error("Error fetching chat threads:", error);
    return { success: false, error: "Failed to fetch chat threads" };
  }
}

// Get a specific chat thread with all conversations
export async function getChatThread(threadId: number) {
  try {
    const userId = await requireUserId();

    const thread = await prisma.chatThread.findFirst({
      where: {
        id: threadId,
        userId,
        isActive: true,
      },
      include: {
        conversations: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!thread) {
      return { success: false, error: "Thread not found" };
    }

    return { success: true, thread };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    console.error("Error fetching chat thread:", error);
    return { success: false, error: "Failed to fetch chat thread" };
  }
}

// Create a new chat thread
export async function createChatThread(data: CreateThreadData) {
  try {
    const userId = await requireUserId();

    const thread = await prisma.chatThread.create({
      data: {
        title: data.title || "New Chat",
        description: data.description,
        userId,
        lastMessageAt: new Date(),
      },
    });

    revalidatePath("/chat");
    return { success: true, thread };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    console.error("Error creating chat thread:", error);
    return { success: false, error: "Failed to create chat thread" };
  }
}

// Update chat thread
export async function updateChatThread(
  threadId: number,
  data: Partial<CreateThreadData & { isPinned?: boolean }>
) {
  try {
    const userId = await requireUserId();

    const thread = await prisma.chatThread.update({
      where: {
        id: threadId,
        userId,
      },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/chat");
    return { success: true, thread };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    console.error("Error updating chat thread:", error);
    return { success: false, error: "Failed to update chat thread" };
  }
}

// Delete chat thread
export async function deleteChatThread(threadId: number) {
  try {
    const userId = await requireUserId();
    
    console.log(`Attempting to delete thread ${threadId} for user ${userId}`);

    const result = await prisma.chatThread.update({
      where: {
        id: threadId,
        userId,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    console.log(`Successfully soft-deleted thread ${threadId}:`, result);
    revalidatePath("/chat");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    console.error("Error deleting chat thread:", error);
    return { success: false, error: "Failed to delete chat thread" };
  }
}

// Add conversation to thread
export async function createConversation(data: CreateConversationData) {
  try {
    const userId = await requireUserId();

    // Verify thread belongs to user
    const thread = await prisma.chatThread.findFirst({
      where: {
        id: data.threadId,
        userId,
        isActive: true,
      },
    });

    if (!thread) {
      throw new Error("Thread not found or unauthorized");
    }

    const conversation = await prisma.chatConversation.create({
        data: {
          content: data.content,
          sender: data.sender,
          messageType: data.messageType || "TEXT",
          isProcessing: data.isProcessing || false,
          feedback: data.feedback,
          comments: data.comments,
          responseTimeSeconds: data.responseTimeSeconds,
          tokenCount: data.tokenCount,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          intermediateSteps: data.intermediateSteps as Prisma.InputJsonValue | undefined,
          systemPrompt: data.systemPrompt as Prisma.InputJsonValue | undefined,
          threadId: data.threadId,
        },
    });

    // Update thread's lastMessageAt
    await prisma.chatThread.update({
      where: { id: data.threadId },
      data: { lastMessageAt: new Date() },
    });

    revalidatePath("/chat");
    return { success: true, conversation };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    console.error("Error creating conversation:", error);
    return { success: false, error: "Failed to create conversation" };
  }
}

// Update conversation (useful for updating processing status)
export async function updateConversation(
  conversationId: number,
  data: UpdateConversationData
) {
  try {
    const userId = await requireUserId();

    const existing = await prisma.chatConversation.findFirst({
      where: { id: conversationId, thread: { userId } },
      select: { id: true },
    });

    if (!existing) return { success: false, error: "Conversation not found" };

    const conversation = await prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        ...data,
        intermediateSteps: data.intermediateSteps as Prisma.InputJsonValue | undefined,
        systemPrompt: data.systemPrompt as Prisma.InputJsonValue | undefined,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/chat");
    return { success: true, conversation };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    console.error("Error updating conversation:", error);
    return { success: false, error: "Failed to update conversation" };
  }
}

// Helper function to call OpenAI Responses API for title generation
async function generateTitleWithOpenAI(userMessage: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: `Generate a concise, descriptive title (maximum 6 words) for a chat conversation that starts with this user message: "${userMessage}". Return only the title, nothing else.`,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Extract title from the responses API structure
  if (data.output && data.output.length > 0 && data.output[0].content && data.output[0].content.length > 0) {
    const generatedTitle = data.output[0].content[0].text?.trim();
    if (generatedTitle) {
      // Remove quotes if present and ensure it's not too long
      return generatedTitle.replace(/^["']|["']$/g, '').substring(0, 60);
    }
  }
  
  throw new Error("Invalid response structure from OpenAI API");
}

// Generate thread title based on first message using OpenAI
export async function generateThreadTitle(threadId: number) {
  try {
    const userId = await requireUserId();

    const firstMessage = await prisma.chatConversation.findFirst({
      where: {
        threadId,
        thread: { userId },
        sender: "USER",
      },
      orderBy: { createdAt: "asc" },
    });

    if (!firstMessage) {
      return { success: false, error: "No user message found" };
    }

    let title: string;
    
    try {
      // Try to generate title using OpenAI
      title = await generateTitleWithOpenAI(firstMessage.content);
    } catch (openaiError) {
      console.warn("Failed to generate title with OpenAI, using fallback:", openaiError);
      // Fallback to truncated message if OpenAI fails
      title = firstMessage.content.length > 50 
        ? firstMessage.content.substring(0, 50) + "..."
        : firstMessage.content;
    }

    const updatedThread = await prisma.chatThread.update({
      where: { id: threadId },
      data: { title },
    });

    revalidatePath("/chat");
    return { success: true, title };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    console.error("Error generating thread title:", error);
    return { success: false, error: "Failed to generate thread title" };
  }
}

// Update conversation feedback and analytics
export async function updateConversationFeedback(
  conversationId: number,
  feedback?: "LIKE" | "DISLIKE" | null,
  comments?: string
) {
  try {
    const userId = await requireUserId();

    const existing = await prisma.chatConversation.findFirst({
      where: { id: conversationId, thread: { userId } },
      select: { id: true },
    });

    if (!existing) return { success: false, error: "Conversation not found" };

    const conversation = await prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        feedback,
        comments,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/chat");
    return { success: true, conversation };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    console.error("Error updating conversation feedback:", error);
    return { success: false, error: "Failed to update conversation feedback" };
  }
}

export async function deleteAllChatThreads() {
  try {
    const userId = await requireUserId();

    console.log(`Attempting to delete all threads for user ${userId}`);

    const [deletedConversations, deletedThreads] = await prisma.$transaction([
      prisma.chatConversation.deleteMany({
        where: { thread: { userId } },
      }),
      prisma.chatThread.deleteMany({
        where: { userId },
      }),
    ]);

    console.log(`Successfully deleted all threads for user ${userId}:`, {
      threads: deletedThreads.count,
      conversations: deletedConversations.count
    });

    revalidatePath("/chat");
    return { 
      success: true, 
      deletedCount: deletedThreads.count,
      deletedConversationCount: deletedConversations.count,
      message: `Successfully deleted ${deletedThreads.count} threads` 
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    console.error("Error deleting all threads:", error);
    return { success: false, error: "Failed to delete all threads" };
  }
}
