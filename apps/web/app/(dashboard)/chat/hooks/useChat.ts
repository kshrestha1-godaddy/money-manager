import { useCallback, useRef, useState } from "react";
import { 
  ChatSettings, 
  DEFAULT_CHAT_SETTINGS,
  FinancialContext, 
  Message,
  ProcessingContext,
  StreamEvent,
  SystemPrompt,
} from "../types/chat";
import { 
  createChatThread, 
  createConversation, 
  generateThreadTitle,
  getChatThread,
  updateConversation,
  updateConversationFeedback,
} from "../actions/chat-threads";
import { 
  calculateTokenCounts,
  generateDefaultSystemPrompt, 
  generateFinancialSystemPrompt,
} from "../utils/prompts";

export interface ThreadSidebarRef {
  updateThread: (threadId: number, updates: { title?: string }) => void;
  addThread: (thread: { id: number; title: string }) => void;
  removeThread: (threadId: number) => void;
}

interface ChatHistoryMessage {
  sender: "USER" | "ASSISTANT";
  content: string;
}

async function* readSseEvents(response: Response): AsyncGenerator<StreamEvent, void, unknown> {
  if (!response.ok) throw new Error("Failed to get response from AI");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("event: ")) currentEvent = line.slice(7).trim();
      if (line.startsWith("data: ")) {
        const raw = line.slice(6).trim();
        if (!raw) continue;
        try {
          yield { event: currentEvent, data: JSON.parse(raw) };
        } catch {
          // ignore invalid JSON
        }
      }
      if (line === "") currentEvent = "";
    }
  }
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<number | null>(null);
  const [threadTitle, setThreadTitle] = useState("Chat");
  
  const [expandedSteps, setExpandedSteps] = useState<Set<number | string>>(new Set());
  const [showComments, setShowComments] = useState<Set<number>>(new Set());
  const [commentText, setCommentText] = useState<Map<number, string>>(new Map());
  const [showSettings, setShowSettings] = useState(false);
  const [showFinancialSelector, setShowFinancialSelector] = useState(false);
  
  const [financialContext, setFinancialContext] = useState<FinancialContext | null>(null);
  const [chatSettings, setChatSettings] = useState<ChatSettings>(DEFAULT_CHAT_SETTINGS);
  
  const sidebarRef = useRef<ThreadSidebarRef>(null);

  const addProcessingStep = useCallback(
    (assistantMessageId: number, step: number, text: string, dbSteps: unknown[], context?: ProcessingContext) => {
      const timestamp = new Date();

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
        ? { 
                ...m,
            processingSteps: [
                  ...(m.processingSteps || []),
                  {
                    step,
                    text,
                    context,
                    timestamp,
                  },
                ],
          }
            : m
        )
      );

      dbSteps.push({
        step,
        text,
        context,
        timestamp: timestamp.toISOString(),
      });
    },
    []
  );

  const loadThread = useCallback(async (threadId: number) => {
    try {
      const result = await getChatThread(threadId);
      if (!result.success || !result.thread) return;
        
      const nextMessages: Message[] = (result.thread.conversations || []).map((conv: any) => ({
            id: conv.id,
            content: conv.content,
            sender: conv.sender,
        createdAt: new Date(conv.createdAt),
            isProcessing: conv.isProcessing,
            feedback: conv.feedback,
            comments: conv.comments,
            responseTimeSeconds: conv.responseTimeSeconds,
            tokenCount: conv.tokenCount,
            inputTokens: conv.inputTokens,
            outputTokens: conv.outputTokens,
        processingSteps: Array.isArray(conv.intermediateSteps)
          ? conv.intermediateSteps.map((step: any) => ({
                ...step,
              timestamp: new Date(step.timestamp),
            }))
          : undefined,
        systemPrompt: conv.systemPrompt || undefined,
      }));

      setMessages(nextMessages);
        setThreadTitle(result.thread.title);
        setCurrentThreadId(threadId);
    } catch (error) {
      console.error("Error loading thread:", error);
    }
  }, []);

  const toggleSteps = useCallback((stepId: number | string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  }, []);

  const handleFeedback = useCallback(
    async (messageId: number, feedback: "LIKE" | "DISLIKE") => {
      const currentMessage = messages.find((m) => m.id === messageId);
      const nextFeedback = currentMessage?.feedback === feedback ? null : feedback;

      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, feedback: nextFeedback } : m))
      );

      try {
        await updateConversationFeedback(messageId, nextFeedback);
    } catch (error) {
      console.error("Error updating feedback:", error);
    }
    },
    [messages]
  );

  const toggleComments = useCallback((messageId: number) => {
    setShowComments((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }, []);

  const handleCommentChange = useCallback((messageId: number, value: string) => {
    setCommentText((prev) => {
      const next = new Map(prev);
      next.set(messageId, value);
      return next;
    });
  }, []);

  const handleCommentSubmit = useCallback(
    async (messageId: number) => {
      const comment = commentText.get(messageId) || "";
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, comments: comment } : m)));

      try {
      await updateConversationFeedback(messageId, undefined, comment);
      } catch (error) {
        console.error("Error updating comment:", error);
      }

      setCommentText((prev) => {
        const next = new Map(prev);
        next.delete(messageId);
        return next;
      });
      
      setShowComments((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    },
    [commentText]
  );

  const clearFinancialContext = useCallback(() => {
    setFinancialContext(null);
  }, []);

  const handleSendMessage = useCallback(async () => {
    const trimmed = inputMessage.trim();
    if (!trimmed) return;

    setInputMessage("");
    setIsLoading(true);
    
    let threadId = currentThreadId;
    if (!threadId) {
      const threadResult = await createChatThread({ title: "New Chat" });
      if (!threadResult.success || !threadResult.thread) {
        setIsLoading(false);
        return;
      }
      threadId = threadResult.thread.id;
      setCurrentThreadId(threadId);
      setThreadTitle(threadResult.thread.title);
      sidebarRef.current?.addThread(threadResult.thread);
    }

    const systemPrompt = financialContext 
      ? generateFinancialSystemPrompt(financialContext)
      : generateDefaultSystemPrompt();
    
    const systemPromptData: SystemPrompt = {
      content: systemPrompt,
      financialContext,
      request: {
        messages: [],
        settings: {
          model: chatSettings.model,
          temperature: chatSettings.temperature,
          max_output_tokens: chatSettings.max_output_tokens,
          top_p: chatSettings.top_p,
        },
        financialContext,
      },
    };

    const userResult = await createConversation({
      threadId,
      content: trimmed,
      sender: "USER",
      messageType: "TEXT",
    });

    if (!userResult.success || !userResult.conversation) {
      setIsLoading(false);
      return;
    }

    const assistantResult = await createConversation({
      threadId,
      content: "",
      sender: "ASSISTANT",
      messageType: "TEXT",
      isProcessing: true,
      systemPrompt: systemPromptData,
    });

    if (!assistantResult.success || !assistantResult.conversation) {
      setIsLoading(false);
      return;
    }

    const userMessage: Message = {
      id: userResult.conversation.id,
      content: trimmed,
      sender: "USER",
      createdAt: new Date(userResult.conversation.createdAt),
    };

    const assistantMessageId = assistantResult.conversation.id;
    const intermediateStepsForDb: unknown[] = [];
    const assistantMessage: Message = {
      id: assistantMessageId,
      content: "",
      sender: "ASSISTANT",
      createdAt: new Date(assistantResult.conversation.createdAt),
      isProcessing: true,
      systemPrompt: systemPromptData,
      processingSteps: [],
    };
    
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    
    // Only send the current user message as the LLM input (no assistant turns / no duplicates).
    const conversationHistory: ChatHistoryMessage[] = [{ sender: "USER", content: trimmed }];

    // Capture the exact input payload we are sending to the API for transparency.
    systemPromptData.request = {
      messages: conversationHistory,
      settings: {
        model: chatSettings.model,
        temperature: chatSettings.temperature,
        max_output_tokens: chatSettings.max_output_tokens,
        top_p: chatSettings.top_p,
      },
      financialContext,
    };

    let accumulatedText = "";
    const responseStartTime = Date.now();
    let hasGeneratedStep = false;

    try {
      addProcessingStep(assistantMessageId, 1, "Preparing request...", intermediateStepsForDb, {
        type: "conversation",
        messageCount: conversationHistory.length,
        totalCharacters: conversationHistory.reduce((sum, m) => sum + m.content.length, 0),
      });
      addProcessingStep(assistantMessageId, 2, "Sending request to AI...", intermediateStepsForDb, {
        type: "ai_connection",
        model: chatSettings.model,
        temperature: chatSettings.temperature,
        hasFinancialContext: Boolean(financialContext),
      });

      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationHistory,
          settings: chatSettings,
          financialContext,
        }),
      });

      for await (const evt of readSseEvents(response)) {
        if (evt.event === "text") {
          if (!hasGeneratedStep) {
            hasGeneratedStep = true;
            addProcessingStep(assistantMessageId, 3, "Generating response...", intermediateStepsForDb);
          }
          accumulatedText += String(evt.data ?? "");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, content: accumulatedText, isProcessing: true } : m
            )
          );
        }

        if (evt.event === "done") {
          addProcessingStep(assistantMessageId, 4, "Response complete.", intermediateStepsForDb);
          break;
        }

        if (evt.event === "error") {
          const message = typeof evt.data?.error === "string" ? evt.data.error : "Streaming error";
          throw new Error(message);
        }
      }

      if (!accumulatedText.trim()) accumulatedText = "Sorry, I didn't receive a response. Please try again.";

      const responseTimeSeconds = (Date.now() - responseStartTime) / 1000;
      const tokenCounts = calculateTokenCounts(systemPrompt, conversationHistory, accumulatedText);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { 
                ...m,
                content: accumulatedText, 
                isProcessing: false,
                responseTimeSeconds,
                tokenCount: tokenCounts.totalTokens,
                inputTokens: tokenCounts.inputTokens,
                outputTokens: tokenCounts.outputTokens,
              }
            : m
        )
      );
      
      await updateConversation(assistantMessageId, {
        content: accumulatedText,
        isProcessing: false,
        responseTimeSeconds,
        tokenCount: tokenCounts.totalTokens,
        inputTokens: tokenCounts.inputTokens,
        outputTokens: tokenCounts.outputTokens,
        systemPrompt: systemPromptData,
        intermediateSteps: intermediateStepsForDb,
      });

      if (threadTitle === "New Chat") {
        const titleResult = await generateThreadTitle(threadId);
        if (titleResult.success && titleResult.title) {
          setThreadTitle(titleResult.title);
          sidebarRef.current?.updateThread(threadId, { title: titleResult.title });
        }
      }
    } catch (error) {
      console.error("Error streaming response:", error);
      const errorMessage = "Sorry, I encountered an error processing your request. Please try again.";
      
      addProcessingStep(assistantMessageId, 99, "Error generating response.", intermediateStepsForDb, {
        type: "ai_connection",
        data: { error: error instanceof Error ? error.message : "Unknown error" },
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId ? { ...m, content: errorMessage, isProcessing: false } : m
        )
      );
      
      await updateConversation(assistantMessageId, {
        content: errorMessage,
        isProcessing: false,
        intermediateSteps: intermediateStepsForDb,
      });
    } finally {
      setIsLoading(false);
    }
  }, [chatSettings, currentThreadId, financialContext, inputMessage, messages, threadTitle]);

  const handleNewChat = useCallback(async () => {
    const threadResult = await createChatThread({ title: "New Chat" });
    setMessages([]);
    
    if (threadResult.success && threadResult.thread) {
      setCurrentThreadId(threadResult.thread.id);
      setThreadTitle(threadResult.thread.title);
      sidebarRef.current?.addThread(threadResult.thread);
      return;
    }

      setCurrentThreadId(null);
      setThreadTitle("Chat");
  }, []);

  return {
    messages,
    inputMessage,
    isLoading,
    currentThreadId,
    threadTitle,
    expandedSteps,
    showComments,
    commentText,
    showSettings,
    showFinancialSelector,
    financialContext,
    chatSettings,
    
    setInputMessage,
    setShowSettings,
    setShowFinancialSelector,
    setFinancialContext,
    setChatSettings,
    
    sidebarRef,
    
    loadThread,
    toggleSteps,
    handleFeedback,
    toggleComments,
    handleCommentChange,
    handleCommentSubmit,
    clearFinancialContext,
    handleSendMessage,
    handleNewChat,
  };
}
