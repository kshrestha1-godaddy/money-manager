export interface Message {
  id: number;
  content: string;
  sender: "USER" | "ASSISTANT";
  createdAt: Date;
  isProcessing?: boolean;
  processingSteps?: ProcessingStep[];
  feedback?: "LIKE" | "DISLIKE" | null;
  comments?: string;
  responseTimeSeconds?: number;
  tokenCount?: number;
  inputTokens?: number;
  outputTokens?: number;
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
  data?: Record<string, unknown>;
  messageCount?: number;
  totalCharacters?: number;
  markdownLength?: number;
  model?: string;
  temperature?: number;
  hasFinancialContext?: boolean;
}

export interface SystemPrompt {
  content: string;
  financialContext: FinancialContext | null;
  /**
   * Full input context that was sent to the LLM for this assistant response.
   * Stored as JSON for transparency/debugging.
   *
   * Note: optional for backwards compatibility with older rows.
   */
  request?: {
    messages: Array<{ sender: "USER" | "ASSISTANT"; content: string }>;
    settings: Pick<ChatSettings, "model" | "temperature" | "max_output_tokens" | "top_p">;
    financialContext: FinancialContext | null;
  };
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
  data: {
    incomes?: any[];
    expenses?: any[];
    debts?: any[];
    investments?: any[];
    transactions?: any[]; // Combined income and expense transactions
    investmentTargets?: any[]; // Investment goals and progress
    accounts?: any[]; // Bank accounts and balances
    budgetTargets?: any[]; // Budget targets and spending limits
  };
  summary: {
    period: string;
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
    currency: string;
    transactionCount: number;
    totalDebtAmount?: number;
    totalDebtRemaining?: number;
    totalInvestmentCost?: number;
    totalInvestmentValue?: number;
    totalInvestmentGain?: number;
    totalTargetAmount?: number;
    totalTargetProgress?: number;
    completedTargets?: number;
    overdueTargets?: number;
    averageProgress?: number;
    totalAccountBalance?: number;
    accountsCount?: number;
    totalBudgetTargets?: number;
    totalBudgetAmount?: number;
    totalBudgetUtilization?: number;
    activeBudgetTargets?: number;
    overBudgetTargets?: number;
    netWorthData?: {
      totalAccountBalance: number;
      totalInvestmentValue: number;
      totalInvestmentCost: number;
      totalInvestmentGain: number;
      totalInvestmentGainPercentage: number;
      totalMoneyLent: number;
      totalAssets: number;
      netWorth: number;
      asOfDate: Date;
    } | null;
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
