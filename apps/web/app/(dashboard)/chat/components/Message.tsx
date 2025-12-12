"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Message as MessageType } from "../types/chat";

interface MessageProps {
  message: MessageType;
  expandedSteps: Set<number | string>;
  showComments: Set<number>;
  commentText: Map<number, string>;
  onToggleSteps: (stepId: number | string) => void;
  onFeedback: (messageId: number, feedback: "LIKE" | "DISLIKE") => void;
  onToggleComments: (messageId: number) => void;
  onCommentChange: (messageId: number, value: string) => void;
  onCommentSubmit: (messageId: number) => void;
}

export function Message({
  message,
  expandedSteps,
  showComments,
  commentText,
  onToggleSteps,
  onFeedback,
  onToggleComments,
  onCommentChange,
  onCommentSubmit
}: MessageProps) {
  const { data: session } = useSession();
  const inputContextText = getInputContextText(message);

  return (
    <div className={`flex gap-4 ${
      message.sender === "USER" ? "justify-end" : "justify-start"
    }`}>
      {/* Assistant Avatar */}
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
        {/* Name */}
        <div className={`flex items-center gap-2 mb-1 ${
          message.sender === "USER" ? "justify-end" : "justify-start"
        }`}>
          <span className="text-base font-medium text-gray-900">
            {message.sender === "USER" ? "You" : "My Money Manager"}
          </span>
        </div>
        
        {/* Processing Steps */}
        {message.sender === "ASSISTANT" && message.processingSteps && message.processingSteps.length > 0 && (
          <ProcessingSteps
            message={message}
            expandedSteps={expandedSteps}
            onToggleSteps={onToggleSteps}
          />
        )}

        {/* System Prompt Display */}
        {message.sender === "ASSISTANT" && !message.isProcessing && message.systemPrompt && (
          <div className="mb-2">
            <button
              onClick={() => onToggleSteps(`system-${message.id}`)}
              className={`flex items-center gap-2 mt-2 text-xs transition-colors ${
                message.systemPrompt?.financialContext 
                  ? 'text-blue-600 hover:text-blue-800' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <svg
                className={`w-4 h-4 transition-transform ${expandedSteps.has(`system-${message.id}`) ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span>
                {expandedSteps.has(`system-${message.id}`) ? 'Hide' : 'Show'} input context{message.systemPrompt?.financialContext ? ' & financial data' : ''}
              </span>
            </button>
            
            {expandedSteps.has(`system-${message.id}`) && (
              <div className={`pl-4 p-3 ${
                message.systemPrompt?.financialContext
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
              }`}>
                <div className={`text-xs whitespace-pre-wrap font-mono p-3 max-h-96 overflow-y-auto ${
                  message.systemPrompt?.financialContext
                    ? 'text-blue-700 bg-blue-100'
                    : 'text-gray-700 bg-gray-100'
                }`}>
                  {inputContextText}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Message Content Box */}
        <div className={`prose max-w-none dark:prose-invert ${
          message.sender === "USER" 
            ? "bg-blue-500 text-white rounded-lg px-4 py-2" 
            : "bg-gray-100 rounded-lg px-4 py-2"
        }`}>
          {message.isProcessing ? (
            <ProcessingMessage 
              message={message}
            />
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

        {/* Timestamp and Analytics */}
        <MessageFooter message={message} />

        {/* Feedback and Comments */}
        {message.sender === "ASSISTANT" && !message.isProcessing && (
          <MessageFeedback
            message={message}
            showComments={showComments}
            commentText={commentText}
            onFeedback={onFeedback}
            onToggleComments={onToggleComments}
            onCommentChange={onCommentChange}
            onCommentSubmit={onCommentSubmit}
          />
        )}

      </div>

      {/* User Avatar */}
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
  );
}

function getInputContextText(message: MessageType): string {
  const systemPrompt = message.systemPrompt;
  if (!systemPrompt) return "";

  const lines: string[] = [];
  lines.push("SYSTEM PROMPT:");
  lines.push(systemPrompt.content);

  const request = systemPrompt.request;
  if (request) {
    lines.push("");
    lines.push("SETTINGS:");
    lines.push(
      JSON.stringify(
        {
          model: request.settings.model,
          temperature: request.settings.temperature,
          max_output_tokens: request.settings.max_output_tokens,
          top_p: request.settings.top_p,
        },
        null,
        2
      )
    );

    lines.push("");
    lines.push("MESSAGES SENT:");
    if (request.messages.length === 0) {
      lines.push("(none)");
    } else {
      request.messages.forEach((m, idx) => {
        lines.push("");
        lines.push(`[${idx + 1}] ${m.sender}:`);
        lines.push(m.content);
      });
    }

    if (request.financialContext) {
      lines.push("");
      lines.push("FINANCIAL CONTEXT SUMMARY:");
      lines.push(JSON.stringify(request.financialContext.summary, null, 2));
      lines.push("");
      lines.push("FINANCIAL CONTEXT MARKDOWN:");
      lines.push(request.financialContext.markdownData);
    }

    return lines.join("\n");
  }

  // Backwards compatibility: older rows only had the system prompt + financialContext.
  if (systemPrompt.financialContext) {
    lines.push("");
    lines.push("FINANCIAL CONTEXT SUMMARY:");
    lines.push(JSON.stringify(systemPrompt.financialContext.summary, null, 2));
    lines.push("");
    lines.push("FINANCIAL CONTEXT MARKDOWN:");
    lines.push(systemPrompt.financialContext.markdownData);
  }

  return lines.join("\n");
}

function ProcessingMessage({
  message,
}: {
  message: MessageType;
}) {
  return (
    <div className="space-y-3">

      {/* Streaming Content or Default Processing */}
      {message.content ? (
        <div className="text-base leading-relaxed text-gray-900">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
          <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse"></span>
        </div>
      ) : (!message.processingSteps || message.processingSteps.length === 0) && (
        <div className="flex items-center gap-2 text-gray-500">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          </div>
          <span className="text-sm text-gray-500">Processing...</span>
        </div>
      )}
    </div>
  );
}

function MessageFooter({ message }: { message: MessageType }) {
  return (
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
        /* Assistant timestamp with metrics */
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {/* Show time and tokens for all completed assistant messages */}
          {!message.isProcessing && (
            <>
              {message.responseTimeSeconds && (
                <span>• {message.responseTimeSeconds.toFixed(1)} s</span>
              )}
              {(message.inputTokens || message.outputTokens || message.tokenCount) && (
                <span>• 
                  {message.inputTokens && message.outputTokens ? (
                    <>
                        <span className="text-gray-500"> ↑ {message.inputTokens} tokens</span>
                      <span className="mx-1">•</span>
                        <span className="text-gray-500"> ↓ {message.outputTokens} tokens</span>
                    </>
                  ) : (
                    <span className="text-gray-500">{message.tokenCount} tokens</span>
                  )}
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MessageFeedback({
  message,
  showComments,
  commentText,
  onFeedback,
  onToggleComments,
  onCommentChange,
  onCommentSubmit
}: {
  message: MessageType;
  showComments: Set<number>;
  commentText: Map<number, string>;
  onFeedback: (messageId: number, feedback: "LIKE" | "DISLIKE") => void;
  onToggleComments: (messageId: number) => void;
  onCommentChange: (messageId: number, value: string) => void;
  onCommentSubmit: (messageId: number) => void;
}) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };
  return (
    <div className="mt-2 space-y-2">
      {/* Feedback Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          className={`p-1 rounded-full transition-colors ${
            isCopied
            ? "text-gray-400 text-gray-600"
              : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
          }`}
          title={isCopied ? "Copied!" : "Copy response"}
        >
          {isCopied ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
        <button
          onClick={() => onFeedback(message.id, "LIKE")}
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
          onClick={() => onFeedback(message.id, "DISLIKE")}
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
          onClick={() => onToggleComments(message.id)}
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
            onChange={(e) => onCommentChange(message.id, e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                onCommentSubmit(message.id);
              }
            }}
            className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={() => onCommentSubmit(message.id)}
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
  );
}

function ProcessingSteps({
  message,
  expandedSteps,
  onToggleSteps
}: {
  message: MessageType;
  expandedSteps: Set<number | string>;
  onToggleSteps: (stepId: number | string) => void;
}) {
  if (!message.processingSteps || message.processingSteps.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => onToggleSteps(message.id)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-600 transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform ${expandedSteps.has(message.id) ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        <span className="text-gray-500">
          {expandedSteps.has(message.id) ? 'Hide' : 'Show'} steps ({message.processingSteps.length})
        </span>
      </button>
      
      {expandedSteps.has(message.id) && (
        <div className="mt-2 pl-4 border-l border-gray-200 space-y-1">
          {message.processingSteps.map((step, index) => (
            <div key={`proc-${index}`} className="text-xs text-gray-500">
              <span className="text-gray-400 font-mono text-xs">
                {step.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              <span className="ml-2 text-gray-500">{step.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
