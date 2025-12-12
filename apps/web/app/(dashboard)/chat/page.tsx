"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@repo/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { ThreadSidebar, ThreadSidebarRef } from "./components/ThreadSidebar";
import { FinancialDataSelector } from "./components/FinancialDataSelector";
import { 
  getChatThread, 
  createChatThread, 
  createConversation, 
  generateThreadTitle,
  updateConversation,
  updateConversationFeedback,
  updateConversationAnalytics
} from "./actions/chat-threads";
import { 
  getFinancialDataForChat, 
  FinancialDataRequest 
} from "./actions/financial-data";

interface Message {
  id: number;
  content: string;
  sender: "USER" | "ASSISTANT";
  createdAt: Date;
  isProcessing?: boolean;
  feedback?: "LIKE" | "DISLIKE" | null;
  comments?: string;
  responseTimeSeconds?: number;
  tokenCount?: number;
  intermediateSteps?: Array<{
    id: number;
    content: string;
    createdAt: Date;
  }>;
}

export default function ChatPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<number | null>(null);
  const [threadTitle, setThreadTitle] = useState<string>("Chat");
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [streamingText, setStreamingText] = useState<Map<number, string>>(new Map());
  const [showComments, setShowComments] = useState<Set<number>>(new Set());
  const [commentText, setCommentText] = useState<Map<number, string>>(new Map());
  const [showSettings, setShowSettings] = useState(false);
  const [showFinancialSelector, setShowFinancialSelector] = useState(false);
  const [financialContext, setFinancialContext] = useState<any>(null);
  const [chatSettings, setChatSettings] = useState({
    model: "gpt-4o",
    temperature: 1,
    max_output_tokens: 4096,
    top_p: 1,
    stream: true,
    parallel_tool_calls: true,
    store: true,
    reasoning: false,
    truncation: 'auto' as 'auto' | 'disabled',
    top_logprobs: 0,
    safety_identifier: "",
    service_tier: 'auto' as 'auto' | 'default' | 'flex' | 'priority'
  });
  const sidebarRef = useRef<ThreadSidebarRef>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Optimized auto-scroll function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: "smooth", 
      block: "end" 
    });
  };

  // Auto-scroll when messages or streaming text changes
  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timer);
  }, [messages, streamingText]);

  // Add keyboard shortcut to return to dashboard
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        window.location.href = '/dashboard';
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  const loadThread = async (threadId: number) => {
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
  };

  const toggleSteps = (messageId: number) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleFeedback = async (messageId: number, feedback: "LIKE" | "DISLIKE") => {
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
  };

  const toggleComments = (messageId: number) => {
    setShowComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleCommentSubmit = async (messageId: number) => {
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
  };

  const handleFinancialDataSelect = async (request: FinancialDataRequest) => {
    try {
      const result = await getFinancialDataForChat(request);
      if (result.success && result.data) {
        setFinancialContext({
          markdownData: result.data.markdownData,
          summary: result.data.summary
        });
      } else {
        console.error("Failed to fetch financial data:", result.error);
        alert("Failed to fetch financial data. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching financial data:", error);
      alert("Error fetching financial data. Please try again.");
    }
  };

  const clearFinancialContext = () => {
    setFinancialContext(null);
  };

  const handleSendMessage = async () => {
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

    try {
      // Build conversation history for OpenAI
      const conversationHistory = allMessages
        .filter((msg: any) => !msg.isProcessing && (msg.sender === "USER" || msg.sender === "ASSISTANT"))
        .map((msg: any) => ({
          sender: msg.sender,
          content: msg.content,
        }));

      // Async generator function to consume the stream and yield tokens
      async function* streamGenerator(): AsyncGenerator<{ event: string; data: any }, void, unknown> {
        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: conversationHistory,
            settings: chatSettings,
            financialContext: financialContext,
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
      }

      // Consume the async generator and process tokens one by one
      for await (const token of streamGenerator()) {
        if (token.event === "text") {
          // Accumulate text locally (for final save)
          accumulatedText += token.data;
          
          // Update streaming text state incrementally and message content
          setStreamingText((prev) => {
            const newMap = new Map(prev);
            newMap.set(assistantMessageId, accumulatedText);
            return newMap;
          });
          
          // Update message content immediately with the accumulated text
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: accumulatedText, isProcessing: true }
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

      // Calculate response time and token count
      const responseTimeSeconds = (Date.now() - responseStartTime) / 1000;
      const tokenCount = accumulatedText.split(/\s+/).length; // Rough token estimation

      // Update final message state in UI and database
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { 
                ...msg, 
                content: accumulatedText, 
                isProcessing: false,
                responseTimeSeconds,
                tokenCount
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
      
      // Update in database with analytics
      await updateConversation(assistantMessageId, {
        content: accumulatedText,
        isProcessing: false,
        responseTimeSeconds,
        tokenCount,
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
      
      // Update UI and database
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: errorMessage, isProcessing: false }
            : msg
        )
      );
      
      await updateConversation(assistantMessageId, {
        content: errorMessage,
        isProcessing: false,
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleThreadSelect = (threadId: number) => {
    loadThread(threadId);
  };

  const handleNewChat = async () => {
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
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Chat Content */}
      <div className="flex flex-1 overflow-hidden pt-24">
        {/* Thread Sidebar */}
        <ThreadSidebar 
          ref={sidebarRef}
          currentThreadId={currentThreadId || undefined}
          onThreadSelect={handleThreadSelect}
          onNewChat={handleNewChat}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-6 py-6"
          >
            {messages.length > 0 && (
              <div className="space-y-6">
                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-4 ${
                    message.sender === "USER" ? "justify-end" : "justify-start"
                  }`}>
                    {/* Assistant messages: Avatar on left */}
                    {message.sender === "ASSISTANT" && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-white border-2 border-gray-200">
                        <Image
                          src="/logo.png"
                          alt="My Money Manager"
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      </div>
                    )}

                    {/* Message Content */}
                    <div className={`max-w-[50%] ${
                      message.sender === "USER" ? "order-1" : "order-2"
                    }`}>
                      <div className={`flex items-center gap-2 mb-1 ${
                        message.sender === "USER" ? "justify-end" : "justify-start"
                      }`}>
                        <span className="text-base font-medium text-gray-900">
                          {message.sender === "USER" ? "You" : "My Money Manager"}
                        </span>
                      </div>
                      
                      <div className={`prose max-w-none dark:prose-invert ${
                        message.sender === "USER" 
                          ? "bg-blue-500 text-white rounded-lg px-4 py-2" 
                          : "bg-gray-100 rounded-lg px-4 py-2"
                      }`}>
                        {message.isProcessing ? (
                          <div>
                            {/* Show streaming text if available, otherwise show loading indicator */}
                            {streamingText.has(message.id) && streamingText.get(message.id) ? (
                              <div className={`text-base leading-relaxed ${
                                message.sender === "USER" ? "text-white" : "text-gray-900"
                              }`}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {streamingText.get(message.id) || ""}
                                </ReactMarkdown>
                                <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse"></span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-gray-600">
                                <div className="flex gap-1">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                                </div>
                                <span className="text-sm">Processing...</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className={`text-base leading-relaxed ${
                            message.sender === "USER" ? "text-white" : "text-gray-900"
                          }`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>

                      {/* Timestamp and Analytics below message */}
                      <div className={`mt-1 ${
                        message.sender === "USER" ? "text-right" : "text-left"
                      }`}>
                        {message.sender === "USER" ? (
                          /* User timestamp only */
                          <span className="text-xs text-gray-500">
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        ) : (
                          /* Assistant timestamp with analytics */
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>
                              {new Date(message.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {!message.isProcessing && (
                              <>
                                {message.responseTimeSeconds && (
                                  <span>• {message.responseTimeSeconds.toFixed(1)}s</span>
                                )}
                                {message.tokenCount && (
                                  <span>• {message.tokenCount} tokens</span>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Feedback and Comments for Assistant Messages */}
                      {message.sender === "ASSISTANT" && !message.isProcessing && (
                        <div className="mt-2 space-y-2">
                          {/* Feedback Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleFeedback(message.id, "LIKE")}
                              className={`p-1 rounded-full transition-colors ${
                                message.feedback === "LIKE"
                                  ? "bg-green-100 text-green-600"
                                  : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                              }`}
                              title="Like this response"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleFeedback(message.id, "DISLIKE")}
                              className={`p-1 rounded-full transition-colors ${
                                message.feedback === "DISLIKE"
                                  ? "bg-red-100 text-red-600"
                                  : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                              }`}
                              title="Dislike this response"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.641a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => toggleComments(message.id)}
                              className="p-1 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Add comment"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </button>
                          </div>

                          {/* Comment Input */}
                          {showComments.has(message.id) && (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Add a comment..."
                                value={commentText.get(message.id) || ""}
                                onChange={(e) => {
                                  setCommentText(prev => {
                                    const newMap = new Map(prev);
                                    newMap.set(message.id, e.target.value);
                                    return newMap;
                                  });
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") {
                                    handleCommentSubmit(message.id);
                                  }
                                }}
                                className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <button
                                onClick={() => handleCommentSubmit(message.id)}
                                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                              >
                                Save
                              </button>
                            </div>
                          )}

                          {/* Existing Comment Display */}
                          {message.comments && (
                            <div className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                              <span className="font-medium"><i>Comment:</i></span> {message.comments}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Intermediate Steps - Collapsible */}
                      {message.sender === "ASSISTANT" && 
                       !message.isProcessing && 
                       message.intermediateSteps && 
                       message.intermediateSteps.length > 0 && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleSteps(message.id)}
                            className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            <svg
                              className={`w-4 h-4 transition-transform ${expandedSteps.has(message.id) ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                            <span>
                              {expandedSteps.has(message.id) ? 'Hide' : 'Show'} {message.intermediateSteps.length} intermediate step{message.intermediateSteps.length > 1 ? 's' : ''}
                            </span>
                          </button>
                          
                          {expandedSteps.has(message.id) && (
                            <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-200">
                              {message.intermediateSteps.map((step, index) => (
                                <div key={step.id} className="text-xs text-gray-600 py-1">
                                  <div className="flex items-start gap-2">
                                    <span className="text-gray-400 font-mono">{index + 1}.</span>
                                    <span className="flex-1">{step.content}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* User messages: Avatar on right */}
                    {message.sender === "USER" && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 order-2">
                        {session?.user?.image ? (
                          <img
                            src={session.user.image}
                            alt={session.user.name || "User"}
                            className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center border-2 border-gray-200">
                            <span className="text-sm font-semibold text-blue-700">
                              {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* Bottom marker for auto-scroll */}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-100 px-6 py-4 flex-shrink-0">
          <div className="flex justify-center">
            <div className="w-2/3 max-w-8xl">
              {/* Financial Context Banner - positioned above input controls */}
              {financialContext && (
                <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                          <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          Financial data included: {financialContext.summary.period}
                        </p>
                        <p className="text-xs text-blue-700">
                          {financialContext.summary.transactionCount} transactions • Net: {financialContext.summary.netAmount} {financialContext.summary.currency}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={clearFinancialContext}
                      className="text-blue-400 hover:text-blue-600 transition-colors"
                      title="Remove financial data"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Input Controls */}
              <div className="flex gap-3">
              <button
                onClick={() => setShowSettings(true)}
                className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Chat Settings"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </button>
              <button
                onClick={() => setShowFinancialSelector(true)}
                className={`p-3 rounded-lg transition-colors ${
                  financialContext 
                    ? 'text-blue-600 bg-blue-100 hover:bg-blue-200' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                title="Include Financial Data"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                  />
                </svg>
              </button>
              <input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here..."
                className="flex-1 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                disabled={isLoading}
              />
              <Button onClick={handleSendMessage}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                  />
                </svg>
              </Button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Chat Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Model Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                  <select
                    value={chatSettings.model}
                    onChange={(e) => setChatSettings(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </select>
                </div>

                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temperature: {chatSettings.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={chatSettings.temperature}
                    onChange={(e) => setChatSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Focused (0)</span>
                    <span>Balanced (1)</span>
                    <span>Creative (2)</span>
                  </div>
                </div>

                {/* Max Output Tokens */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Output Tokens</label>
                  <input
                    type="number"
                    min="1"
                    max="8192"
                    value={chatSettings.max_output_tokens}
                    onChange={(e) => setChatSettings(prev => ({ ...prev, max_output_tokens: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Top P */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Top P: {chatSettings.top_p}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={chatSettings.top_p}
                    onChange={(e) => setChatSettings(prev => ({ ...prev, top_p: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                {/* Top Logprobs */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Top Logprobs</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={chatSettings.top_logprobs}
                    onChange={(e) => setChatSettings(prev => ({ ...prev, top_logprobs: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Service Tier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service Tier</label>
                  <select
                    value={chatSettings.service_tier}
                    onChange={(e) => setChatSettings(prev => ({ ...prev, service_tier: e.target.value as any }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="auto">Auto</option>
                    <option value="default">Default</option>
                    <option value="flex">Flex</option>
                    <option value="priority">Priority</option>
                  </select>
                </div>

                {/* Truncation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Truncation</label>
                  <select
                    value={chatSettings.truncation}
                    onChange={(e) => setChatSettings(prev => ({ ...prev, truncation: e.target.value as any }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="auto">Auto</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>

                {/* Safety Identifier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Safety Identifier</label>
                  <input
                    type="text"
                    value={chatSettings.safety_identifier}
                    onChange={(e) => setChatSettings(prev => ({ ...prev, safety_identifier: e.target.value }))}
                    placeholder="Optional safety identifier"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Boolean Options */}
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={chatSettings.stream}
                      onChange={(e) => setChatSettings(prev => ({ ...prev, stream: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Stream Response</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={chatSettings.parallel_tool_calls}
                      onChange={(e) => setChatSettings(prev => ({ ...prev, parallel_tool_calls: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Parallel Tool Calls</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={chatSettings.store}
                      onChange={(e) => setChatSettings(prev => ({ ...prev, store: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Store Response</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={chatSettings.reasoning}
                      onChange={(e) => setChatSettings(prev => ({ ...prev, reasoning: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Enable Reasoning</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Financial Data Selector Modal */}
      <FinancialDataSelector
        isOpen={showFinancialSelector}
        onClose={() => setShowFinancialSelector(false)}
        onSelect={handleFinancialDataSelect}
      />
    </div>
  );
}