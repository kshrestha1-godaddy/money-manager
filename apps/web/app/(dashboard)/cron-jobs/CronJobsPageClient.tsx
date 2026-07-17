"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Clock, Play, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import {
  getCronJobRunDetail,
  getCronJobsDashboardData,
  triggerAllCronJobs,
  triggerCronJob,
  type CronJobDashboardItem,
  type CronJobRunListItem,
  type CronJobsDashboardData,
} from "./actions/cron-jobs";
import { CronLogViewer, CronResultSummary } from "./components/CronLogViewer";

function statusBadgeClass(status: string): string {
  switch (status) {
    case "SUCCESS":
      return "bg-green-100 text-green-800";
    case "PARTIAL":
      return "bg-amber-100 text-amber-800";
    case "FAILED":
      return "bg-red-100 text-red-800";
    case "SKIPPED":
      return "bg-gray-100 text-gray-700";
    case "RUNNING":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms && ms !== 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function CronJobsPageClient() {
  const [data, setData] = useState<CronJobsDashboardData | null>(null);
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null);
  const [runDetails, setRunDetails] = useState<
    Record<number, Awaited<ReturnType<typeof getCronJobRunDetail>>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(() => {
    startTransition(async () => {
      try {
        setError(null);
        const next = await getCronJobsDashboardData();
        setData(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load cron jobs");
      }
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleRunAll() {
    startTransition(async () => {
      try {
        setError(null);
        await triggerAllCronJobs();
        loadData();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to run all cron jobs");
      }
    });
  }

  function handleRunJob(slug: string) {
    startTransition(async () => {
      try {
        setError(null);
        await triggerCronJob(slug);
        loadData();
      } catch (e) {
        setError(e instanceof Error ? e.message : `Failed to run ${slug}`);
      }
    });
  }

  function toggleRun(runId: number) {
    if (expandedRunId === runId) {
      setExpandedRunId(null);
      return;
    }
    setExpandedRunId(runId);
    if (!runDetails[runId]) {
      startTransition(async () => {
        try {
          const detail = await getCronJobRunDetail(runId);
          setRunDetails((prev) => ({ ...prev, [runId]: detail }));
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to load run details");
        }
      });
    }
  }

  if (!data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-500">
        {error ?? "Loading cron jobs…"}
      </div>
    );
  }

  const latestBatch = data.recentBatches[0];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-gray-700" />
            <h1 className="text-2xl font-semibold text-gray-900">Cron Jobs</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Monitor scheduled tasks, inspect run history, and trigger jobs manually.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleRunAll}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Run all jobs
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {latestBatch ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          Last batch:{" "}
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(latestBatch.status)}`}
          >
            {latestBatch.status}
          </span>{" "}
          via {latestBatch.triggerSource} · {formatRelativeTime(latestBatch.startedAt)} ·{" "}
          {formatDuration(latestBatch.durationMs)}
        </div>
      ) : null}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Job definitions</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.jobs.map((job) => (
            <JobCard
              key={job.slug}
              job={job}
              isPending={isPending}
              onRun={() => handleRunJob(job.slug)}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Run history</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Run</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Job</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Trigger</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Started</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Duration</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Results</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.recentJobRuns.map((run) => (
                <JobRunHistoryRow
                  key={run.id}
                  run={run}
                  isExpanded={expandedRunId === run.id}
                  detail={runDetails[run.id]}
                  onToggle={() => toggleRun(run.id)}
                />
              ))}
            </tbody>
          </table>
          {data.recentJobRuns.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-500">No cron runs recorded yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function JobCard({
  job,
  isPending,
  onRun,
}: {
  job: CronJobDashboardItem;
  isPending: boolean;
  onRun: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {job.category}
          </p>
          <h3 className="mt-1 text-base font-semibold text-gray-900">{job.name}</h3>
        </div>
        {job.lastRun ? (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(job.lastRun.status)}`}
          >
            {job.lastRun.status}
          </span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            Never run
          </span>
        )}
      </div>

      <p className="mt-3 text-sm text-gray-600">{job.description}</p>

      <dl className="mt-4 space-y-1 text-xs text-gray-500">
        <div>
          <span className="font-medium text-gray-700">Schedule:</span> {job.scheduleLabel}
        </div>
        <div>
          <span className="font-medium text-gray-700">Gate:</span> {job.gateType}
        </div>
        {job.killSwitchEnvKey ? (
          <div>
            <span className="font-medium text-gray-700">Kill switch:</span>{" "}
            {job.killSwitchEnvKey}
          </div>
        ) : null}
        <div>
          <span className="font-medium text-gray-700">Slug:</span> {job.slug}
        </div>
      </dl>

      <button
        type="button"
        onClick={onRun}
        disabled={isPending || !job.isEnabled}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Play className="h-3.5 w-3.5" />
        Run now
      </button>
    </div>
  );
}

function JobRunHistoryRow({
  run,
  isExpanded,
  detail,
  onToggle,
}: {
  run: CronJobRunListItem;
  isExpanded: boolean;
  detail?: Awaited<ReturnType<typeof getCronJobRunDetail>>;
  onToggle: () => void;
}) {
  const displayLogs = detail?.logs ?? run.logs;

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 font-medium text-gray-900"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            #{run.id}
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="font-medium text-gray-900">{run.jobName}</div>
          <div className="text-xs text-gray-500">
            {run.jobSlug} · batch #{run.batchRunId}
          </div>
        </td>
        <td className="px-4 py-3 text-gray-600">
          {run.triggerSource}
          {run.triggeredByEmail ? ` · ${run.triggeredByEmail}` : ""}
        </td>
        <td className="px-4 py-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(run.status)}`}
          >
            {run.status}
          </span>
        </td>
        <td className="px-4 py-3 text-gray-600">{formatRelativeTime(run.startedAt)}</td>
        <td className="px-4 py-3 text-gray-600">{formatDuration(run.durationMs)}</td>
        <td className="px-4 py-3 text-gray-600">
          {run.successCount} ok · {run.skippedCount} skipped · {run.errorCount} errors
        </td>
      </tr>
      {isExpanded ? (
        <tr>
          <td colSpan={7} className="bg-gray-50 px-4 py-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              {run.skipReason ? (
                <p className="mb-2 text-xs text-gray-600">Skip reason: {run.skipReason}</p>
              ) : null}
              {run.errorMessage ? (
                <p className="mb-2 text-xs text-red-600">{run.errorMessage}</p>
              ) : null}
              <p className="mb-2 text-xs font-medium text-gray-700">
                Detailed logs ({displayLogs.length})
              </p>
              <CronLogViewer logs={displayLogs} />
              {detail?.resultJson ? (
                <CronResultSummary resultJson={detail.resultJson} />
              ) : !detail ? (
                <p className="mt-2 text-xs text-gray-500">Loading result summary…</p>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
