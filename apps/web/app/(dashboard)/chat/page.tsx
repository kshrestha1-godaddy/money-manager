"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@repo/ui/button";
import { ThreadSidebar, ThreadSidebarRef } from "./components/ThreadSidebar";
import { 
  getChatThread, 
  createChatThread, 
  createConversation, 
  generateThreadTitle,
  updateChatThread
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

const conversationStarters = [
  {
    id: 1,
    title: "Connect API endpoints",
    description: "Help me integrate multiple API services",
    icon: "🔗"
  },
  {
    id: 2,
    title: "Data transformation",
    description: "Transform data between different formats",
    icon: "🔄"
  },
  {
    id: 3,
    title: "Database integration",
    description: "Set up database connections and queries",
    icon: "🗄️"
  },
  {
    id: 4,
    title: "Webhook configuration",
    description: "Configure webhooks and event handling",
    icon: "📡"
  }
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<number | null>(null);
  const [threadTitle, setThreadTitle] = useState<string>("Integration Chat");
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
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
    
    // Create new thread if none exists (this should rarely happen now)
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
      content: inputMessage,
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

    // Add processing message
    const processingResult = await createConversation({
      threadId: threadId!,
      content: "Processing your request...",
      sender: "ASSISTANT" as any,
      messageType: "TEXT" as any,
      isProcessing: true,
      processingSteps: 1,
    });

    if (processingResult.success) {
      await loadThread(threadId!);
    }

    // Simulate bot response
    setTimeout(async () => {
      // Remove processing message and add real response
      const botResult = await createConversation({
        threadId: threadId!,
        content: "I understand your request. Let me help you with that integration task.",
        sender: "ASSISTANT" as any,
        messageType: "TEXT" as any,
      });

      if (botResult.success) {
        await loadThread(threadId!);
        
        // Generate thread title from first user message if it's still "New Chat"
        if (threadTitle === "New Chat") {
          const titleResult = await generateThreadTitle(threadId!);
          if (titleResult.success && titleResult.title) {
            setThreadTitle(titleResult.title);
            // Update thread title in sidebar without full refresh
            sidebarRef.current?.updateThread(threadId!, { title: titleResult.title });
          }
        }
      }
      
      setIsLoading(false);
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStarterClick = async (starter: typeof conversationStarters[0]) => {
    let threadId = currentThreadId;
    
    // Use existing thread if available, otherwise create new thread
    if (!threadId) {
      const threadResult = await createChatThread({
        title: starter.title,
      });
      
      if (!threadResult.success || !threadResult.thread) {
        console.error("Failed to create thread");
        return;
      }
      
      threadId = threadResult.thread.id;
      setCurrentThreadId(threadId);
      setThreadTitle(starter.title);
      // Add thread to sidebar without full refresh
      sidebarRef.current?.addThread(threadResult.thread);
    } else {
      // Update thread title if it's still "New Chat"
      if (threadTitle === "New Chat") {
        const updateResult = await updateChatThread(threadId, { title: starter.title });
        if (updateResult.success) {
          setThreadTitle(starter.title);
          sidebarRef.current?.updateThread(threadId, { title: starter.title });
        }
      }
    }
    
    setIsLoading(true);

    // Add user message
    const userResult = await createConversation({
      threadId,
      content: starter.title,
      sender: "USER" as any,
      messageType: "TEXT" as any,
    });

    if (userResult.success) {
      await loadThread(threadId);
    }

    // Add processing message
    const processingResult = await createConversation({
      threadId,
      content: "I'll help you with that integration task...",
      sender: "ASSISTANT" as any,
      messageType: "TEXT" as any,
      isProcessing: true,
      processingSteps: 1,
    });

    if (processingResult.success) {
      await loadThread(threadId);
    }

    // Simulate bot response
    setTimeout(async () => {
      const botResult = await createConversation({
        threadId,
        content: `Great! I'll help you with ${starter.description.toLowerCase()}. Let me guide you through the process step by step.`,
        sender: "ASSISTANT" as any,
        messageType: "TEXT" as any,
      });

      if (botResult.success) {
        await loadThread(threadId);
      }
      
      setIsLoading(false);
    }, 1500);
  };

  const handleThreadSelect = (threadId: number) => {
    loadThread(threadId); // Default is false for enableAutoScroll - don't auto-scroll when selecting existing threads
  };

  const handleNewChat = async () => {
    // Create a new thread immediately when "New Chat" is clicked
    const threadResult = await createChatThread({
      title: "New Chat",
    });
    
    if (threadResult.success && threadResult.thread) {
      setMessages([]);
      setCurrentThreadId(threadResult.thread.id);
      setThreadTitle(threadResult.thread.title);
      // Add thread to sidebar without full refresh
      sidebarRef.current?.addThread(threadResult.thread);
    } else {
      console.error("Failed to create new thread:", threadResult.error);
      // Fallback to reset state if thread creation fails
      setMessages([]);
      setCurrentThreadId(null);
      setThreadTitle("Integration Chat");
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
            <span className="text-gray-900 font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Integration Chat
            </span>
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
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white text-base font-bold">C</span>
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-950 tracking-tight">{threadTitle}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Messages or Conversation Starters */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {messages.length === 0 ? (
              /* Empty State with Assistant Info */
              <div className="flex flex-col">
                <div className="flex flex-col justify-center items-center min-h-[400px]">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-white text-2xl font-bold">C</span>
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">Integration Assistant</h2>
                    <p className="text-gray-600">Choose a starting point or type your own message</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Chat Messages */
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
                      
                      <div className="prose prose-sm max-w-none">
                        {message.isProcessing ? (
                          <div className="flex items-center gap-2 text-gray-600">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                            </div>
                            <span className="text-sm">Processing...</span>
                          </div>
                        ) : (
                          <p className="text-gray-700 leading-relaxed">{message.content}</p>
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

          {/* Conversation Starters - only show when no messages */}
          {messages.length === 0 && (
            <div className="px-6 py-4">
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {conversationStarters.map((starter) => (
                    <button
                      key={starter.id}
                      onClick={() => handleStarterClick(starter)}
                      className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all text-left group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-lg">{starter.icon}</div>
                        <div>
                          <h3 className="font-medium text-gray-900 mb-1 group-hover:text-gray-700 text-sm">
                            {starter.title}
                          </h3>
                          <p className="text-xs text-gray-600">{starter.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
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