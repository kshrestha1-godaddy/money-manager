export interface Message {
  id: number;
  content: string;
  sender: "USER" | "ASSISTANT";
  createdAt: Date;
  isProcessing?: boolean;
  processingSteps?: ProcessingStep[];
  processingExpanded?: boolean;
  processingComplete?: boolean;
  feedback?: "LIKE" | "DISLIKE" | null;
  comments?: string;
  responseTimeSeconds?: number;
  tokenCount?: number;
  inputTokens?: number;
  outputTokens?: number;
  intermediateSteps?: IntermediateStep[];
  systemPrompt?: SystemPrompt;
}

export interface ProcessingStep {
  step: number;
  text: string;
  context?: ProcessingContext;
  timestamp: Date;
}

export interface ProcessingContext {
  type: "financial" | "conversation" | "ai_connection";
  data?: any;
  messageCount?: number;
  totalCharacters?: number;
  markdownLength?: number;
  model?: string;
  temperature?: number;
  hasFinancialContext?: boolean;
}

export interface IntermediateStep {
  id: number;
  content: string;
  createdAt: Date;
}

export interface SystemPrompt {
  content: string;
  financialContext: any;
}

export interface ChatSettings {
  model: string;
  temperature: number;
  max_output_tokens: number;
  top_p: number;
  stream: boolean;
  parallel_tool_calls: boolean;
  store: boolean;
  reasoning: boolean;
  truncation: 'auto' | 'disabled';
  top_logprobs: number;
  safety_identifier: string;
  service_tier: 'auto' | 'default' | 'flex' | 'priority';
}

export interface FinancialContext {
  markdownData: string;
  summary: {
    period: string;
    totalIncome: string;
    totalExpenses: string;
    netAmount: string;
    currency: string;
    transactionCount: number;
  };
}

export interface StreamEvent {
  event: string;
  data: any;
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  model: "gpt-4o-mini",
  temperature: 1,
  max_output_tokens: 4096,
  top_p: 1,
  stream: true,
  parallel_tool_calls: true,
  store: true,
  reasoning: false,
  truncation: 'auto',
  top_logprobs: 0,
  safety_identifier: "",
  service_tier: 'auto'
};
