"use client";

import { useState, useRef } from "react";
import { Button } from "@repo/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ThreadSidebar, ThreadSidebarRef } from "./components/ThreadSidebar";
import { 
  getChatThread, 
  createChatThread, 
  createConversation, 
  generateThreadTitle,
  updateConversation
} from "./actions/chat-threads";

interface Message {
  id: number;
  content: string;
  sender: "USER" | "ASSISTANT";
  createdAt: Date;
  isProcessing?: boolean;
  processingSteps?: number;
  intermediateSteps?: Array<{
    id: number;
    content: string;
    createdAt: Date;
  }>;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<number | null>(null);
  const [threadTitle, setThreadTitle] = useState<string>("Chat");
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [streamingText, setStreamingText] = useState<Map<number, string>>(new Map());
  const sidebarRef = useRef<ThreadSidebarRef>(null);

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
            processingSteps: conv.processingSteps,
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

    setInputMessage("");
    setIsLoading(true);

    // Reload messages to show user message
    await loadThread(threadId!);
    
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
        console.log("[Client] Starting stream request with messages:", conversationHistory.length);
        
        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: conversationHistory,
            threadId,
          }),
        });

        console.log("[Client] Stream response status:", response.status, response.statusText);

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
        let chunkCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log("[Client] Stream reader done, total chunks processed:", chunkCount);
            break;
          }

          chunkCount++;
          const rawChunk = decoder.decode(value, { stream: true });
          console.log(`[Client] Received chunk #${chunkCount}:`, rawChunk.substring(0, 150));
          
          buffer += rawChunk;
          const lines = buffer.split("\n");
          
          // Keep incomplete line in buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
              console.log("[Client] Parsed event type:", currentEvent);
            } else if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              
              if (!data) continue;

              try {
                const parsedData = JSON.parse(data);
                console.log("[Client] Parsed data for event", currentEvent, ":", typeof parsedData === 'string' ? parsedData.substring(0, 50) : parsedData);
                // Yield the event with parsed data
                yield { event: currentEvent, data: parsedData };
              } catch (e) {
                // Skip invalid JSON
                console.warn("[Client] Failed to parse SSE data:", data.substring(0, 50), e);
              }
            } else if (line === "") {
              // Empty line resets event
              currentEvent = "";
            }
          }
        }
      }

      // Consume the async generator and process tokens one by one
      // Update streaming state incrementally for smooth streaming effect
      let tokenCount = 0;
      for await (const token of streamGenerator()) {
        tokenCount++;
        console.log(`[Client] Processing token #${tokenCount}:`, token.event, "| Data:", typeof token.data === 'string' ? token.data.substring(0, 50) : token.data);
        
        if (token.event === "text") {
          // Accumulate text locally (for final save)
          accumulatedText += token.data;
          
          // Update streaming text state incrementally and message content
          setStreamingText((prev) => {
            const newMap = new Map(prev);
            newMap.set(assistantMessageId, accumulatedText);
            console.log("[Client] Streaming text updated, length:", accumulatedText.length, "| Latest token:", token.data);
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
          console.log("[Client] Stream complete, total tokens received:", tokenCount);
          // Stream complete
          break;
        } else if (token.event === "error") {
          console.error("[Client] Stream error:", token.data);
          throw new Error(token.data.error || "Streaming error");
        }
      }
      
      // Use accumulated text (tracked locally) for final save
      console.log("[Client] Finished processing stream, final text length:", accumulatedText.length);
      console.log("[Client] Final accumulated text:", accumulatedText.substring(0, 100));

      if (!accumulatedText || accumulatedText.trim() === "") {
        console.warn("[Client] No text accumulated, this shouldn't happen");
        accumulatedText = "Sorry, I didn't receive a response. Please try again.";
      }

      // Update final message state in UI first (for immediate feedback)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: accumulatedText, isProcessing: false }
            : msg
        )
      );
      
      // Clear streaming state for this message
      setStreamingText((prev) => {
        const newMap = new Map(prev);
        newMap.delete(assistantMessageId);
        return newMap;
      });
      
      // Then update in database
      await updateConversation(assistantMessageId, {
        content: accumulatedText,
        isProcessing: false,
      });
      
      // Reload to sync with database (this will also handle intermediate steps grouping)
      await loadThread(threadId!);
      
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
      
      // Update UI immediately
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: "Sorry, I encountered an error processing your request. Please try again.", isProcessing: false }
            : msg
        )
      );
      
      // Update database
      await updateConversation(assistantMessageId, {
        content: "Sorry, I encountered an error processing your request. Please try again.",
        isProcessing: false,
      });
      await loadThread(threadId!);
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
    <div className="flex flex-col h-[calc(100vh-8rem)] overflow-hidden -mt-6 -mx-6">
      {/* Navigation Breadcrumb */}
      <div className="border-b border-gray-100 px-6 py-3">
          <div className="flex items-center gap-2 text-sm">
            <a 
              href="/dashboard" 
              className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
              </svg>
              Dashboard
            </a>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-900 font-medium">Chat</span>
          </div>
      </div>

      {/* Chat Content */}
      <div className="flex flex-1 overflow-hidden">
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
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {messages.length > 0 && (
              <div className="space-y-6">
                {messages.map((message) => (
                  <div key={message.id} className="flex gap-4">
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                      message.sender === "USER" 
                        ? "bg-gray-800 text-white" 
                        : "bg-gradient-to-r from-pink-500 to-red-500 text-white"
                    }`}>
                      {message.sender === "USER" ? "Y" : "C"}
                    </div>

                    {/* Message Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {message.sender === "USER" ? "You" : "Chatbot"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        {message.isProcessing ? (
                          <div>
                            {/* Show streaming text if available, otherwise show loading indicator */}
                            {streamingText.has(message.id) && streamingText.get(message.id) ? (
                              <div className="text-gray-700 leading-relaxed">
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
                          <div className="text-gray-700 leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>

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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-100 px-6 py-4 bg-white flex-shrink-0">
          <div className="flex gap-3">
            {/* Attachment button */}
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
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
                  d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
                />
              </svg>
            </button>

            {/* Input field */}
            <input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              className="flex-1 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              disabled={isLoading}
            />

            {/* Send button */}
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
  );
}