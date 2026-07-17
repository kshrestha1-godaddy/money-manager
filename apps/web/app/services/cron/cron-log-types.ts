export type CronLogLevel = "info" | "success" | "skip" | "warning" | "error";

export interface CronLogEntry {
  at: string;
  level: CronLogLevel;
  message: string;
  userId?: number;
  email?: string;
  details?: Record<string, unknown>;
}

export interface CronLogCollector {
  logs: CronLogEntry[];
  info: (message: string, opts?: Omit<CronLogEntry, "at" | "level" | "message">) => void;
  success: (message: string, opts?: Omit<CronLogEntry, "at" | "level" | "message">) => void;
  skip: (message: string, opts?: Omit<CronLogEntry, "at" | "level" | "message">) => void;
  warn: (message: string, opts?: Omit<CronLogEntry, "at" | "level" | "message">) => void;
  error: (message: string, opts?: Omit<CronLogEntry, "at" | "level" | "message">) => void;
}

function pushLog(
  logs: CronLogEntry[],
  level: CronLogLevel,
  message: string,
  opts?: Omit<CronLogEntry, "at" | "level" | "message">
) {
  logs.push({
    at: new Date().toISOString(),
    level,
    message,
    ...opts,
  });
}

export function createCronLogCollector(): CronLogCollector {
  const logs: CronLogEntry[] = [];
  return {
    logs,
    info(message, opts) {
      pushLog(logs, "info", message, opts);
    },
    success(message, opts) {
      pushLog(logs, "success", message, opts);
    },
    skip(message, opts) {
      pushLog(logs, "skip", message, opts);
    },
    warn(message, opts) {
      pushLog(logs, "warning", message, opts);
    },
    error(message, opts) {
      pushLog(logs, "error", message, opts);
    },
  };
}

export function extractLogsFromResult(raw: unknown): CronLogEntry[] {
  if (!raw || typeof raw !== "object") return [];
  const data = raw as Record<string, unknown>;
  if (Array.isArray(data.logs)) return data.logs as CronLogEntry[];
  if (data.result && typeof data.result === "object") {
    const nested = data.result as Record<string, unknown>;
    if (Array.isArray(nested.logs)) return nested.logs as CronLogEntry[];
  }
  return [];
}

export function wrapResultWithLogs<T extends Record<string, unknown>>(
  result: T,
  logs: CronLogEntry[]
): T & { logs: CronLogEntry[] } {
  return { ...result, logs };
}
