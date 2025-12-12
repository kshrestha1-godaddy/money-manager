import { useCallback } from "react";
import { Message, ProcessingStep, ProcessingContext, FinancialContext, ChatSettings } from "../types/chat";

interface UseProcessingStepsProps {
  assistantMessageId: number;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function useProcessingSteps({ assistantMessageId, setMessages }: UseProcessingStepsProps) {
  const updateProcessingStep = useCallback((step: number, stepText: string, contextData?: ProcessingContext) => {
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
  }, [assistantMessageId, setMessages]);

  const runProcessingSteps = useCallback(async (
    financialContext: FinancialContext | null,
    conversationHistory: Array<{ sender: string; content: string }>,
    chatSettings: ChatSettings
  ) => {
    // Step 1: Preparing request
    updateProcessingStep(1, "Preparing your request...");
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
      updateProcessingStep(2, "Processing financial data...", {
        type: "financial",
        data: financialSummary,
        markdownLength: financialContext.markdownData.length
      });
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    // Step 3: Building conversation context
    updateProcessingStep(financialContext ? 3 : 2, "Building conversation context...", {
      type: "conversation",
      messageCount: conversationHistory.length,
      totalCharacters: conversationHistory.reduce((sum, msg) => sum + msg.content.length, 0)
    });
    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 4: Connecting to AI
    updateProcessingStep(financialContext ? 4 : 3, "Connecting to AI assistant...", {
      type: "ai_connection",
      model: chatSettings.model || "gpt-4",
      temperature: chatSettings.temperature,
      hasFinancialContext: !!financialContext
    });
    await new Promise(resolve => setTimeout(resolve, 200));

    // Step 5: Sending to LLM
    updateProcessingStep(financialContext ? 5 : 4, "Sending complete prompt to LLM...");
    await new Promise(resolve => setTimeout(resolve, 300));
  }, [updateProcessingStep]);

  const collapseProcessingSteps = useCallback(() => {
    setMessages((prev) => prev.map(msg => 
      msg.id === assistantMessageId 
        ? { ...msg, processingExpanded: false }
        : msg
    ));
  }, [assistantMessageId, setMessages]);

  const completeProcessingSteps = useCallback((responseTimeSeconds: number, inputTokens: number, outputTokens: number) => {
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
  }, [assistantMessageId, setMessages]);

  return {
    runProcessingSteps,
    collapseProcessingSteps,
    completeProcessingSteps
  };
}
