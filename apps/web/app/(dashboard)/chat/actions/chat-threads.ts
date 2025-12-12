"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import prisma from "@repo/db/client";
import { revalidatePath } from "next/cache";
import { getUserIdFromSession } from "../../../utils/auth";
// Import enums from the database schema
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
  processingSteps?: number;
  attachments?: any;
}

// Get all chat threads for the current user
export async function getChatThreads() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized for user " + session?.user?.id);
    }
    
    const userId = getUserIdFromSession(session.user.id);

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
    console.error("Error fetching chat threads:", error);
    return { success: false, error: "Failed to fetch chat threads" };
  }
}

// Get a specific chat thread with all conversations
export async function getChatThread(threadId: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized for user " + session?.user?.id);
    }
    
    const userId = getUserIdFromSession(session.user.id);

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
    console.error("Error fetching chat thread:", error);
    return { success: false, error: "Failed to fetch chat thread" };
  }
}

// Create a new chat thread
export async function createChatThread(data: CreateThreadData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized for user " + session?.user?.id);
    }
    
    const userId = getUserIdFromSession(session.user.id);

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
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized for user " + session?.user?.id);
    }
    
    const userId = getUserIdFromSession(session.user.id);

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
    console.error("Error updating chat thread:", error);
    return { success: false, error: "Failed to update chat thread" };
  }
}

// Delete chat thread
export async function deleteChatThread(threadId: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized for user " + session?.user?.id);
    }
    
    const userId = getUserIdFromSession(session.user.id);

    await prisma.chatThread.update({
      where: {
        id: threadId,
        userId,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/chat");
    return { success: true };
  } catch (error) {
    console.error("Error deleting chat thread:", error);
    return { success: false, error: "Failed to delete chat thread" };
  }
}

// Add conversation to thread
export async function createConversation(data: CreateConversationData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized for user " + session?.user?.id);
    }
    
    const userId = getUserIdFromSession(session.user.id);

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
          processingSteps: data.processingSteps || 0,
          attachments: data.attachments,
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
    console.error("Error creating conversation:", error);
    return { success: false, error: "Failed to create conversation" };
  }
}

// Update conversation (useful for updating processing status)
export async function updateConversation(
  conversationId: number,
  data: Partial<CreateConversationData>
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized for user " + session?.user?.id);
    }

    const conversation = await prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/chat");
    return { success: true, conversation };
  } catch (error) {
    console.error("Error updating conversation:", error);
    return { success: false, error: "Failed to update conversation" };
  }
}

// Generate thread title based on first message
export async function generateThreadTitle(threadId: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized for user " + session?.user?.id);
    }

    const firstMessage = await prisma.chatConversation.findFirst({
      where: {
        threadId,
        sender: "USER",
      },
      orderBy: { createdAt: "asc" },
    });

    if (!firstMessage) {
      return { success: false, error: "No user message found" };
    }

    // Generate title from first 50 characters of first user message
    const title = firstMessage.content.length > 50 
      ? firstMessage.content.substring(0, 50) + "..."
      : firstMessage.content;

    const updatedThread = await prisma.chatThread.update({
      where: { id: threadId },
      data: { title },
    });

    revalidatePath("/chat");
    return { success: true, title };
  } catch (error) {
    console.error("Error generating thread title:", error);
    return { success: false, error: "Failed to generate thread title" };
  }
}

export async function deleteAllChatThreads() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = getUserIdFromSession(session.user.id);

    // Delete all conversations first (due to foreign key constraints)
    await prisma.chatConversation.deleteMany({
      where: {
        thread: {
          userId: userId,
        },
      },
    });

    // Then delete all threads for the user
    const deleteResult = await prisma.chatThread.deleteMany({
      where: {
        userId: userId,
      },
    });

    revalidatePath("/chat");
    return { 
      success: true, 
      deletedCount: deleteResult.count,
      message: `Successfully deleted ${deleteResult.count} threads` 
    };
  } catch (error) {
    console.error("Error deleting all threads:", error);
    return { success: false, error: "Failed to delete all threads" };
  }
}
