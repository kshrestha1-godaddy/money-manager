import { NextRequest, NextResponse } from "next/server";
import type { CronTriggerSource } from "@prisma/client";
import { getCronRequestContext, verifyCronRequest } from "./cron-auth";
import { runCronJobs } from "../services/cron/cron-orchestrator";
import type { CronBatchRunSummary } from "../services/cron/cron-registry";

export interface CronApiRouteOptions {
  jobSlugs?: string[];
  triggerSource: CronTriggerSource;
  successMessage: string;
  errorLogLabel: string;
  formatResponse?: (result: CronBatchRunSummary) => unknown;
  isSuccess?: (result: CronBatchRunSummary) => boolean;
  failureStatus?: number;
}

function defaultFormatResponse(result: CronBatchRunSummary) {
  return result;
}

function defaultIsSuccess(result: CronBatchRunSummary) {
  return result.status !== "FAILED";
}

export async function handleCronApiRoute(
  request: NextRequest,
  options: CronApiRouteOptions
): Promise<NextResponse> {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  const formatResponse = options.formatResponse ?? defaultFormatResponse;
  const isSuccess = options.isSuccess ?? defaultIsSuccess;

  try {
    const result = await runCronJobs({
      jobSlugs: options.jobSlugs,
      triggerSource: options.triggerSource,
      requestContext: getCronRequestContext(request),
    });

    const success = isSuccess(result);

    return NextResponse.json(
      {
        success,
        message: options.successMessage,
        result: formatResponse(result),
      },
      success ? undefined : { status: options.failureStatus ?? 500 }
    );
  } catch (error) {
    console.error(`Error in ${options.errorLogLabel}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

export function getJobResultJson(
  result: CronBatchRunSummary,
  jobSlug: string
): unknown {
  return result.jobs.find((job) => job.jobSlug === jobSlug)?.resultJson ?? null;
}

export function getJobRun(
  result: CronBatchRunSummary,
  jobSlug: string
) {
  return result.jobs.find((job) => job.jobSlug === jobSlug);
}

export function unwrapNestedResultJson(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const data = raw as Record<string, unknown>;
  if (data.result && typeof data.result === "object") return data.result;
  return raw;
}
