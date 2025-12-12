export {
  generateDefaultSystemPrompt,
  generateFinancialSystemPrompt,
} from "../../../lib/chat/prompts";

/**
 * Calculate estimated token count for text (rough approximation)
 */
export function calculateTokenCount(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters or 0.75 words
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

/**
 * Calculate input and output tokens for analytics
 */
export function calculateTokenCounts(
  systemPrompt: string,
  conversationHistory: Array<{ content: string }>,
  responseText: string
) {
  const systemPromptTokens = calculateTokenCount(systemPrompt);
  const conversationTokens = conversationHistory.reduce((total, msg) => {
    return total + calculateTokenCount(msg.content);
  }, 0);
  
  const inputTokens = systemPromptTokens + conversationTokens;
  const outputTokens = calculateTokenCount(responseText);
  const totalTokens = inputTokens + outputTokens;

  return {
    inputTokens,
    outputTokens,
    totalTokens
  };
}
