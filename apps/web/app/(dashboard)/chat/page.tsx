"use client";

import { useEffect, useRef } from "react";
import { Button } from "@repo/ui/button";
import { ThreadSidebar } from "./components/ThreadSidebar";
import { InlineFinancialSelector } from "./components/InlineFinancialSelector";
import { Message } from "./components/Message";
import { SettingsModal } from "./components/SettingsModal";
import { useChat } from "./hooks/useChat";
import { getFinancialDataForChat, FinancialDataRequest } from "./actions/financial-data";
import { FinancialContext } from "./types/chat";

export default function ChatPage() {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    // State
    messages,
    inputMessage,
    isLoading,
    currentThreadId,
    expandedSteps,
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
  } = useChat();

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
  }, [messages]);

  const handleFinancialDataSelect = async (request: FinancialDataRequest) => {
    try {
      const result = await getFinancialDataForChat(request);
      if (result.success && result.data) {
        setFinancialContext({
          markdownData: result.data.markdownData,
          data: {
            incomes: result.data.incomes,
            expenses: result.data.expenses,
            debts: result.data.debts,
            investments: result.data.investments,
            transactions: result.data.transactions,
            investmentTargets: result.data.investmentTargets,
            accounts: result.data.accounts
          },
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

  const handleSendMessageWithSelectorClose = () => {
    // Close financial selector if open
    if (showFinancialSelector) {
      setShowFinancialSelector(false);
    }
    handleSendMessage();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessageWithSelectorClose();
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
          onThreadSelect={loadThread}
          onNewChat={handleNewChat}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div 
            className="flex-1 overflow-y-auto px-6 py-6"
          >
            {messages.length > 0 && (
              <div className="space-y-6">
                {messages.map((message) => (
                  <Message
                    key={message.id}
                    message={message}
                    expandedSteps={expandedSteps}
                    showComments={showComments}
                    commentText={commentText}
                    onToggleSteps={toggleSteps}
                    onFeedback={handleFeedback}
                    onToggleComments={toggleComments}
                    onCommentChange={handleCommentChange}
                    onCommentSubmit={handleCommentSubmit}
                  />
                ))}
              </div>
            )}
            {/* Bottom marker for auto-scroll */}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-100 px-6 pt-4 pb-8 flex-shrink-0">
          <div className="flex justify-center">
            <div className="w-2/3 max-w-8xl">
              {/* Financial Context Banner - positioned above input controls */}
              {financialContext && (
                <div className="flex gap-3 mb-3">
                  <div className="w-12"></div> {/* Spacer to align with input field */}
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-6 h-6 bg-gray-200 rounded-md flex items-center justify-center">
                          <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                            <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="text-sm font-medium text-gray-900">Financial Data Active</h4>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                        
                        {/* Data Types Included */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {financialContext.data?.incomes && financialContext.data.incomes.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                              Income ({financialContext.data.incomes.length})
                            </span>
                          )}
                          {financialContext.data?.expenses && financialContext.data.expenses.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                              Expenses ({financialContext.data.expenses.length})
                            </span>
                          )}
                          {financialContext.data?.debts && financialContext.data.debts.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                              Debts ({financialContext.data.debts.length})
                            </span>
                          )}
                          {financialContext.data?.investments && financialContext.data.investments.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                              Investments ({financialContext.data.investments.length})
                            </span>
                          )}
                          {financialContext.data?.transactions && financialContext.data.transactions.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                              Transactions ({financialContext.data.transactions.length})
                            </span>
                          )}
                          {financialContext.data?.investmentTargets && financialContext.data.investmentTargets.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                              Investment Targets ({financialContext.data.investmentTargets.length})
                            </span>
                          )}
                          {financialContext.data?.accounts && financialContext.data.accounts.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                              Bank Accounts ({financialContext.data.accounts.length})
                            </span>
                          )}
                          {financialContext.summary?.netWorthData && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                              Net Worth
                            </span>
                          )}
                        </div>

                        {/* Summary Info */}
                        <div className="flex items-center space-x-3 text-xs text-gray-600">
                          {financialContext.summary?.period && (
                            <span>Period: {financialContext.summary.period}</span>
                          )}
                          {financialContext.summary?.transactionCount && financialContext.summary.transactionCount > 0 && (
                            <span>{financialContext.summary.transactionCount} transactions</span>
                          )}
                          {financialContext.summary?.netAmount !== undefined && (
                            <span className="font-medium text-gray-800">
                              Net: {financialContext.summary.netAmount >= 0 ? '+' : ''}{financialContext.summary.netAmount} {financialContext.summary.currency}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 ml-3">
                      <button
                        onClick={() => setShowFinancialSelector(true)}
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-all duration-200"
                        title="Edit financial data selection"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={clearFinancialContext}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md transition-all duration-200"
                        title="Remove financial data"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  </div>
                  <div className="w-12"></div> {/* Spacer to align with send button */}
                </div>
              )}
              
              {/* Inline Financial Data Selector - positioned above input */}
              {showFinancialSelector && (
                <div className="flex gap-3 mb-2 ">
                  <div className="w-12"></div> {/* Spacer to align with input field */}
                  <div className="flex-1">
                    <InlineFinancialSelector
                      isVisible={showFinancialSelector}
                      onSelect={handleFinancialDataSelect}
                      onClose={() => setShowFinancialSelector(false)}
                    />
                  </div>
                  <div className="w-12"></div> {/* Spacer to align with send button */}
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
                onClick={() => setShowFinancialSelector(!showFinancialSelector)}
                className={`p-3 rounded-lg transition-colors ${
                  financialContext || showFinancialSelector
                    ? 'text-blue-600 bg-blue-100 hover:bg-blue-200' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                title={showFinancialSelector ? "Close Financial Data Selector" : "Include Financial Data"}
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
              <Button onClick={handleSendMessageWithSelectorClose}>
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
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        chatSettings={chatSettings}
        setChatSettings={setChatSettings}
      />

    </div>
  );
}