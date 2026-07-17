"use client";

import type { CronLogEntry } from "../../services/cron/cron-log-types";

function logLevelClass(level: CronLogEntry["level"]): string {
  switch (level) {
    case "success":
      return "text-green-700 bg-green-50 border-green-100";
    case "skip":
      return "text-gray-600 bg-gray-50 border-gray-100";
    case "warning":
      return "text-amber-700 bg-amber-50 border-amber-100";
    case "error":
      return "text-red-700 bg-red-50 border-red-100";
    default:
      return "text-blue-700 bg-blue-50 border-blue-100";
  }
}

function formatLogTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function extractLogsFromResultJson(resultJson: unknown): CronLogEntry[] {
  if (!resultJson || typeof resultJson !== "object") return [];
  const data = resultJson as Record<string, unknown>;
  if (Array.isArray(data.logs)) return data.logs as CronLogEntry[];
  return [];
}

interface CronLogViewerProps {
  logs: CronLogEntry[];
  maxHeight?: string;
  emptyMessage?: string;
}

export function CronLogViewer({
  logs,
  maxHeight = "max-h-72",
  emptyMessage = "No detailed logs recorded for this run.",
}: CronLogViewerProps) {
  if (logs.length === 0) {
    return <p className="text-xs text-gray-500">{emptyMessage}</p>;
  }

  return (
    <div className={`space-y-2 overflow-y-auto ${maxHeight}`}>
      {logs.map((log, index) => (
        <div
          key={`${log.at}-${index}`}
          className={`rounded-md border px-3 py-2 text-xs ${logLevelClass(log.level)}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase opacity-70">
              {formatLogTime(log.at)}
            </span>
            <span className="rounded bg-white/60 px-1.5 py-0.5 font-medium uppercase">
              {log.level}
            </span>
            {log.userId ? (
              <span className="font-mono text-[10px] opacity-80">user #{log.userId}</span>
            ) : null}
            {log.email ? (
              <span className="truncate opacity-80">{log.email}</span>
            ) : null}
          </div>
          <p className="mt-1 leading-relaxed">{log.message}</p>
          {log.details && Object.keys(log.details).length > 0 ? (
            <pre className="mt-2 overflow-x-auto rounded bg-white/50 p-2 font-mono text-[10px]">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          ) : null}
        </div>
      ))}
    </div>
  );
}

interface CronResultSummaryProps {
  resultJson: unknown;
}

export function CronResultSummary({ resultJson }: CronResultSummaryProps) {
  if (!resultJson || typeof resultJson !== "object") return null;
  const data = resultJson as Record<string, unknown>;
  const { logs: _logs, ...summary } = data;
  if (Object.keys(summary).length === 0) return null;

  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs font-medium text-gray-600">
        Raw result summary
      </summary>
      <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-100 p-2 text-xs text-gray-700">
        {JSON.stringify(summary, null, 2)}
      </pre>
    </details>
  );
}
