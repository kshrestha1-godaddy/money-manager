/**
 * Estimates the monetary cost of a chat completion from its token counts.
 *
 * Rates are USD per million tokens, as published for the OpenAI models this
 * app offers in its settings. They are duplicated here deliberately: the API
 * does not return a price, so a local table is the only way to show cost
 * alongside the token counts.
 */

/** USD per million tokens, by model. */
interface ModelRate {
  input: number;
  output: number;
}

/**
 * Published rates for the models offered in chat settings.
 *
 * Keys are matched by longest prefix, so dated snapshots such as
 * `gpt-4o-mini-2024-07-18` resolve to their base model.
 */
const MODEL_RATES: Record<string, ModelRate> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4-turbo": { input: 10, output: 30 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
};

const USD_PER_MILLION = 1_000_000;

export interface MessageCost {
  /** Cost of the prompt, in USD. */
  inputCost: number;
  /** Cost of the completion, in USD. */
  outputCost: number;
  /** Combined cost, in USD. */
  totalCost: number;
  /** The rate-table key used, so the UI can show which model was priced. */
  model: string;
}

/**
 * Find the rate for a model id, tolerating dated snapshot suffixes.
 *
 * @param model - The model id the request was sent with.
 * @returns The matching rate and its key, or null if the model is unpriced.
 */
function resolveRate(model: string): { rate: ModelRate; key: string } | null {
  const candidates = Object.keys(MODEL_RATES)
    .filter((key) => model.startsWith(key))
    .sort((a, b) => b.length - a.length);

  const key = candidates[0];
  return key ? { rate: MODEL_RATES[key]!, key } : null;
}

/**
 * Estimate what a completion cost, given its token counts.
 *
 * @param model - The model id the request was sent with.
 * @param inputTokens - Prompt tokens.
 * @param outputTokens - Completion tokens.
 * @returns The cost breakdown, or null if the model has no published rate.
 */
export function estimateMessageCost(
  model: string | undefined,
  inputTokens: number | undefined,
  outputTokens: number | undefined,
): MessageCost | null {
  if (!model || inputTokens === undefined || outputTokens === undefined) return null;

  const resolved = resolveRate(model);
  if (!resolved) return null;

  const inputCost = (inputTokens / USD_PER_MILLION) * resolved.rate.input;
  const outputCost = (outputTokens / USD_PER_MILLION) * resolved.rate.output;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    model: resolved.key,
  };
}

/**
 * Format a USD cost for display, keeping sub-cent amounts legible.
 *
 * @param usd - The amount in US dollars.
 * @returns A string such as `$0.0042`, or `<$0.0001` for negligible amounts.
 */
export function formatCost(usd: number): string {
  if (usd === 0) return "$0";
  if (usd < 0.0001) return "<$0.0001";
  if (usd < 1) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}
