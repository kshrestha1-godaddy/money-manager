import { useState, useRef, useCallback } from "react";
import { 
  Message, 
  ChatSettings, 
  FinancialContext, 
  DEFAULT_CHAT_SETTINGS, 
  StreamEvent 
} from "../types/chat";
import { 
  getChatThread, 
  createChatThread, 
  createConversation, 
  generateThreadTitle,
  updateConversation,
  updateConversationFeedback,
} from "../actions/chat-threads";
import { 
  generateDefaultSystemPrompt, 
  generateFinancialSystemPrompt,
  calculateTokenCounts
} from "../utils/prompts";

export interface ThreadSidebarRef {
  updateThread: (threadId: number, updates: any) => void;
  addThread: (thread: any) => void;
}

export function useChat() {
  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<number | null>(null);
  const [threadTitle, setThreadTitle] = useState<string>("Chat");
  
  // UI state
  const [expandedSteps, setExpandedSteps] = useState<Set<number | string>>(new Set());
  const [streamingText, setStreamingText] = useState<Map<number, string>>(new Map());
  const [showComments, setShowComments] = useState<Set<number>>(new Set());
  const [commentText, setCommentText] = useState<Map<number, string>>(new Map());
  const [showSettings, setShowSettings] = useState(false);
  const [showFinancialSelector, setShowFinancialSelector] = useState(false);
  
  // Chat configuration
  const [financialContext, setFinancialContext] = useState<FinancialContext | null>(null);
  const [chatSettings, setChatSettings] = useState<ChatSettings>(DEFAULT_CHAT_SETTINGS);
  
  // Refs
  const sidebarRef = useRef<ThreadSidebarRef>(null);

  // Processing steps functions
  const updateProcessingStep = useCallback((assistantMessageId: number, step: number, stepText: string, contextData?: any) => {
    setMessages((prev) => prev.map(msg => 
      msg.id === assistantMessageId 
        ? { 
            ...msg, 
            processingSteps: [
              ...(msg.processingSteps || []),
              {
                step,
                text: stepText,
                context: contextData,
                timestamp: new Date()
              }
            ]
          }
        : msg
    ));
  }, []);

  const collapseProcessingSteps = useCallback((assistantMessageId: number) => {
    setMessages((prev) => prev.map(msg => 
      msg.id === assistantMessageId 
        ? { ...msg, processingExpanded: false }
        : msg
    ));
  }, []);

  const completeProcessingSteps = useCallback((assistantMessageId: number, responseTimeSeconds: number, inputTokens: number, outputTokens: number) => {
    setMessages((prev) => prev.map(msg => 
      msg.id === assistantMessageId 
        ? { 
            ...msg, 
            processingComplete: true,
            responseTimeSeconds,
            inputTokens,
            outputTokens
          }
        : msg
    ));
  }, []);

  const runProcessingSteps = useCallback(async (
    assistantMessageId: number,
    financialContext: FinancialContext | null,
    conversationHistory: Array<{ sender: string; content: string }>,
    chatSettings: ChatSettings
  ) => {
    // Step 1: Preparing request
    updateProcessingStep(assistantMessageId, 1, "Preparing your request...");
    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 2: Processing financial data (if applicable)
    if (financialContext) {
      const financialSummary = {
        period: financialContext.summary.period,
        totalIncome: financialContext.summary.totalIncome,
        totalExpenses: financialContext.summary.totalExpenses,
        netAmount: financialContext.summary.netAmount,
        currency: financialContext.summary.currency,
        transactionCount: financialContext.summary.transactionCount
      };
      updateProcessingStep(assistantMessageId, 2, "Processing financial data...", {
        type: "financial",
        data: financialSummary,
        markdownLength: financialContext.markdownData.length
      });
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    // Step 3: Building conversation context
    updateProcessingStep(assistantMessageId, financialContext ? 3 : 2, "Building conversation context...", {
      type: "conversation",
      messageCount: conversationHistory.length,
      totalCharacters: conversationHistory.reduce((sum, msg) => sum + msg.content.length, 0)
    });
    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 4: Connecting to AI
    updateProcessingStep(assistantMessageId, financialContext ? 4 : 3, "Connecting to AI assistant...", {
      type: "ai_connection",
      model: chatSettings.model || "gpt-4",
      temperature: chatSettings.temperature,
      hasFinancialContext: !!financialContext
    });
    await new Promise(resolve => setTimeout(resolve, 200));

    // Step 5: Sending to LLM
    updateProcessingStep(assistantMessageId, financialContext ? 5 : 4, "Sending complete prompt to LLM...");
    await new Promise(resolve => setTimeout(resolve, 300));
  }, [updateProcessingStep]);

  const loadThread = useCallback(async (threadId: number) => {
    try {
      const result = await getChatThread(threadId);
      if (result.success && result.thread) {
        const conversations = result.thread.conversations || [];
        
        // Group messages by turn and collect intermediate steps
        const groupedMessages: Message[] = [];
        let currentUserMessage: Message | null = null;
        let intermediateSteps: Message[] = [];
        
        conversations.forEach((conv: any) => {
          const message: Message = {
            id: conv.id,
            content: conv.content,
            sender: conv.sender,
            createdAt: conv.createdAt,
            isProcessing: conv.isProcessing,
            feedback: conv.feedback,
            comments: conv.comments,
            responseTimeSeconds: conv.responseTimeSeconds,
            tokenCount: conv.tokenCount,
            inputTokens: conv.inputTokens,
            outputTokens: conv.outputTokens,
            processingSteps: conv.intermediateSteps ? JSON.parse(JSON.stringify(conv.intermediateSteps)) : undefined,
            systemPrompt: conv.systemPrompt ? JSON.parse(JSON.stringify(conv.systemPrompt)) : (
              conv.sender === "ASSISTANT" ? {
                content: generateDefaultSystemPrompt(),
                financialContext: null
              } : undefined
            ),
          };
          
          if (conv.sender === "USER") {
            // Complete previous turn if exists
            if (currentUserMessage) {
              groupedMessages.push(currentUserMessage);
            }
            // If there are pending steps without a final message, attach them to the last assistant message or show as processing
            if (intermediateSteps.length > 0) {
              // This shouldn't happen normally, but handle it
              const lastStep = intermediateSteps[intermediateSteps.length - 1];
              if (lastStep) {
                lastStep.isProcessing = true;
                lastStep.intermediateSteps = intermediateSteps.slice(0, -1);
                groupedMessages.push(lastStep);
              }
              intermediateSteps = [];
            }
            
            // Start new turn
            currentUserMessage = message;
            intermediateSteps = [];
          } else if (conv.sender === "ASSISTANT") {
            if (conv.isProcessing) {
              // Collect intermediate processing steps
              intermediateSteps.push(message);
            } else {
              // Final assistant response - complete the turn
              if (currentUserMessage) {
                groupedMessages.push(currentUserMessage);
                currentUserMessage = null;
              }
              // Attach intermediate steps to the final message
              message.intermediateSteps = intermediateSteps;
              groupedMessages.push(message);
              intermediateSteps = [];
            }
          }
        });
        
        // Handle any remaining messages
        if (currentUserMessage) {
          groupedMessages.push(currentUserMessage);
        }
        if (intermediateSteps.length > 0) {
          // If we have steps but no final message, show the last step as processing
          const lastStep = intermediateSteps[intermediateSteps.length - 1];
          if (lastStep) {
            lastStep.isProcessing = true;
            lastStep.intermediateSteps = intermediateSteps.slice(0, -1);
            groupedMessages.push(lastStep);
          }
        }
        
        setMessages(groupedMessages);
        setThreadTitle(result.thread.title);
        setCurrentThreadId(threadId);
      }
    } catch (error) {
      console.error("Error loading thread:", error);
    }
  }, []);

  const toggleSteps = useCallback((stepId: number | string) => {
    // Handle processing steps that have their own expanded state
    if (typeof stepId === 'string' && stepId.startsWith('processing-')) {
      const messageId = parseInt(stepId.replace('processing-', ''));
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId && msg.processingExpanded !== undefined) {
          return { ...msg, processingExpanded: !msg.processingExpanded };
        }
        return msg;
      }));
    }
    
    // Handle other expandable steps (system prompts, intermediate steps)
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  }, []);

  const handleFeedback = useCallback(async (messageId: number, feedback: "LIKE" | "DISLIKE") => {
    try {
      // Update local state immediately
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, feedback: msg.feedback === feedback ? null : feedback }
            : msg
        )
      );

      // Update in database
      const currentMessage = messages.find(msg => msg.id === messageId);
      const newFeedback = currentMessage?.feedback === feedback ? null : feedback;
      
      await updateConversationFeedback(messageId, newFeedback);
    } catch (error) {
      console.error("Error updating feedback:", error);
    }
  }, [messages]);

  const toggleComments = useCallback((messageId: number) => {
    setShowComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  }, []);

  const handleCommentChange = useCallback((messageId: number, value: string) => {
    setCommentText(prev => {
      const newMap = new Map(prev);
      newMap.set(messageId, value);
      return newMap;
    });
  }, []);

  const handleCommentSubmit = useCallback(async (messageId: number) => {
    try {
      const comment = commentText.get(messageId) || "";
      
      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, comments: comment }
            : msg
        )
      );

      // Update in database
      await updateConversationFeedback(messageId, undefined, comment);
      
      // Clear comment input
      setCommentText(prev => {
        const newMap = new Map(prev);
        newMap.delete(messageId);
        return newMap;
      });
      
      // Hide comment input
      setShowComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    } catch (error) {
      console.error("Error updating comment:", error);
    }
  }, [commentText]);

  const clearFinancialContext = useCallback(() => {
    setFinancialContext(null);
  }, []);

  // Stream generator function
  const createStreamGenerator = useCallback(async function* (
    conversationHistory: Array<{ sender: string; content: string }>,
    settings: ChatSettings,
    financialContext: FinancialContext | null
  ): AsyncGenerator<StreamEvent, void, unknown> {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: conversationHistory,
        settings,
        financialContext,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get response from OpenAI");
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("No response body");
    }

    // Parse SSE stream and yield events
    let buffer = "";
    let currentEvent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const rawChunk = decoder.decode(value, { stream: true });
      
      buffer += rawChunk;
      const lines = buffer.split("\n");
      
      // Keep incomplete line in buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          
          if (!data) continue;

          try {
            const parsedData = JSON.parse(data);
            yield { event: currentEvent, data: parsedData };
          } catch (e) {
            // Skip invalid JSON
            console.warn("Failed to parse SSE data:", e);
          }
        } else if (line === "") {
          currentEvent = "";
        }
      }
    }
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim()) return;
    
    let threadId = currentThreadId;
    const userMessageContent = inputMessage.trim();
    
    // Create new thread if none exists
    if (!threadId) {
      const threadResult = await createChatThread({
        title: "New Chat",
      });
      
      if (!threadResult.success || !threadResult.thread) {
        console.error("Failed to create thread:", threadResult.error);
        return;
      }
      
      threadId = threadResult.thread.id;
      setCurrentThreadId(threadId);
      setThreadTitle(threadResult.thread.title);
    }

    // Add user message
    const userResult = await createConversation({
      threadId: threadId!,
      content: userMessageContent,
      sender: "USER" as any,
      messageType: "TEXT" as any,
    });

    if (!userResult.success) {
      console.error("Failed to create user message:", userResult.error);
      return;
    }

    // Add user message to UI immediately
    const userMessage: Message = {
      id: userResult.conversation!.id,
      content: userMessageContent,
      sender: "USER",
      createdAt: new Date(userResult.conversation!.createdAt),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    
    // Get updated messages for conversation history
    const updatedMessagesResult = await getChatThread(threadId!);
    const allMessages = updatedMessagesResult.success && updatedMessagesResult.thread?.conversations 
      ? updatedMessagesResult.thread.conversations 
      : [];

    // Create temporary assistant message for streaming
    const processingResult = await createConversation({
      threadId: threadId!,
      content: "",
      sender: "ASSISTANT" as any,
      messageType: "TEXT" as any,
      isProcessing: true,
    });

    if (!processingResult.success || !processingResult.conversation) {
      console.error("Failed to create processing message:", processingResult.error);
      setIsLoading(false);
      return;
    }

    const assistantMessageId = processingResult.conversation.id;
    
    // Add processing message to state immediately for streaming
    const processingMessage: Message = {
      id: assistantMessageId,
      content: "",
      sender: "ASSISTANT",
      createdAt: new Date(processingResult.conversation.createdAt),
      isProcessing: true,
      processingSteps: [],
      processingExpanded: true, // Start expanded
      processingComplete: false,
      systemPrompt: {
        content: financialContext 
          ? generateFinancialSystemPrompt(financialContext)
          : generateDefaultSystemPrompt(),
        financialContext: financialContext
      },
    };
    
    setMessages((prev) => [...prev, processingMessage]);
    
    // Initialize streaming text state for this message
    setStreamingText((prev) => {
      const newMap = new Map(prev);
      newMap.set(assistantMessageId, "");
      return newMap;
    });

    // Track accumulated text locally for final save (React state updates are async)
    let accumulatedText = "";
    const responseStartTime = Date.now();

    // Build conversation history for OpenAI
    const conversationHistory = allMessages
      .filter((msg: any) => !msg.isProcessing && (msg.sender === "USER" || msg.sender === "ASSISTANT"))
      .map((msg: any) => ({
        sender: msg.sender,
        content: msg.content,
      }));

    try {
      // Run processing steps with expanded dropdown
      await runProcessingSteps(assistantMessageId, financialContext, conversationHistory, chatSettings);

      // Collapse the dropdown just before streaming starts
      collapseProcessingSteps(assistantMessageId);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Consume the async generator and process tokens one by one
      for await (const token of createStreamGenerator(conversationHistory, chatSettings, financialContext)) {
        if (token.event === "text") {
          // Accumulate text locally (for final save)
          accumulatedText += token.data;
          
          // Update streaming text state incrementally and message content
          setStreamingText((prev) => {
            const newMap = new Map(prev);
            newMap.set(assistantMessageId, accumulatedText);
            return newMap;
          });
          
          // Update message content immediately with the accumulated text (preserve ALL properties)
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { 
                    ...msg, 
                    content: accumulatedText, 
                    isProcessing: true,
                  // Explicitly preserve all processing-related properties AND intermediate steps
                  processingSteps: msg.processingSteps,
                  processingExpanded: msg.processingExpanded,
                  processingComplete: msg.processingComplete,
                  intermediateSteps: msg.intermediateSteps,
                  systemPrompt: msg.systemPrompt
                  }
                : msg
            )
          );
        } else if (token.event === "chat_output") {
          // Stream complete
          break;
        } else if (token.event === "error") {
          throw new Error(token.data.error || "Streaming error");
        }
      }
      
      // Use accumulated text (tracked locally) for final save
      if (!accumulatedText || accumulatedText.trim() === "") {
        accumulatedText = "Sorry, I didn't receive a response. Please try again.";
      }

      // Calculate response time and token counts
      const responseTimeSeconds = (Date.now() - responseStartTime) / 1000;
      const systemPrompt = financialContext 
        ? generateFinancialSystemPrompt(financialContext)
        : generateDefaultSystemPrompt();
      
      const tokenCounts = calculateTokenCounts(systemPrompt, conversationHistory, accumulatedText);

      // Complete processing steps with final metrics
      completeProcessingSteps(assistantMessageId, responseTimeSeconds, tokenCounts.inputTokens, tokenCounts.outputTokens);

      // Update final message state in UI and database (preserve ALL existing properties)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { 
                ...msg, 
                content: accumulatedText, 
                isProcessing: false,
                responseTimeSeconds,
                tokenCount: tokenCounts.totalTokens,
                inputTokens: tokenCounts.inputTokens,
                outputTokens: tokenCounts.outputTokens,
                // Explicitly preserve processing-related properties AND intermediate steps
                processingSteps: msg.processingSteps,
                processingExpanded: msg.processingExpanded,
                processingComplete: msg.processingComplete,
                intermediateSteps: msg.intermediateSteps,
                systemPrompt: msg.systemPrompt
              }
            : msg
        )
      );
      
      // Clear streaming state for this message
      setStreamingText((prev) => {
        const newMap = new Map(prev);
        newMap.delete(assistantMessageId);
        return newMap;
      });
      
      // Get the current message to access processing steps and system prompt
      const currentMessage = messages.find(msg => msg.id === assistantMessageId);
      
      // Update in database with analytics and intermediate data
      await updateConversation(assistantMessageId, {
        content: accumulatedText,
        isProcessing: false,
        responseTimeSeconds,
        tokenCount: tokenCounts.totalTokens,
        inputTokens: tokenCounts.inputTokens,
        outputTokens: tokenCounts.outputTokens,
        intermediateSteps: currentMessage?.processingSteps || [],
        systemPrompt: currentMessage?.systemPrompt || (financialContext ? {
          type: 'financial',
          prompt: systemPrompt,
          financialContext
        } : {
          type: 'default',
          prompt: systemPrompt
        }),
      });
      
      // Generate thread title if needed
      if (threadTitle === "New Chat") {
        const titleResult = await generateThreadTitle(threadId!);
        if (titleResult.success && titleResult.title) {
          setThreadTitle(titleResult.title);
          sidebarRef.current?.updateThread(threadId!, { title: titleResult.title });
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error streaming response:", error);
      setIsLoading(false);
      
      const errorMessage = "Sorry, I encountered an error processing your request. Please try again.";
      
      // Update UI and database (preserve ALL existing properties)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { 
                ...msg, 
                content: errorMessage, 
                isProcessing: false, 
                // Explicitly preserve processing-related properties AND intermediate steps
                processingSteps: msg.processingSteps,
                processingExpanded: msg.processingExpanded,
                processingComplete: msg.processingComplete,
                intermediateSteps: msg.intermediateSteps,
                systemPrompt: msg.systemPrompt
              }
            : msg
        )
      );
      
      await updateConversation(assistantMessageId, {
        content: errorMessage,
        isProcessing: false,
      });
    }
  }, [
    inputMessage, 
    currentThreadId, 
    threadTitle, 
    financialContext, 
    chatSettings, 
    messages,
    createStreamGenerator
  ]);

  const handleNewChat = useCallback(async () => {
    const threadResult = await createChatThread({
      title: "New Chat",
    });
    
    if (threadResult.success && threadResult.thread) {
      setMessages([]);
      setCurrentThreadId(threadResult.thread.id);
      setThreadTitle(threadResult.thread.title);
      sidebarRef.current?.addThread(threadResult.thread);
    } else {
      console.error("Failed to create new thread:", threadResult.error);
      setMessages([]);
      setCurrentThreadId(null);
      setThreadTitle("Chat");
    }
  }, []);

  return {
    // State
    messages,
    inputMessage,
    isLoading,
    currentThreadId,
    threadTitle,
    expandedSteps,
    streamingText,
    showComments,
    commentText,
    showSettings,
    showFinancialSelector,
    financialContext,
    chatSettings,
    
    // Setters
    setInputMessage,
    setShowSettings,
    setShowFinancialSelector,
    setFinancialContext,
    setChatSettings,
    
    // Refs
    sidebarRef,
    
    // Actions
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
