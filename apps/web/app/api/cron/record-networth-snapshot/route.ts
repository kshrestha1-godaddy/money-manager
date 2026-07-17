import { NextRequest } from "next/server";
import {
  getJobRun,
  handleCronApiRoute,
  unwrapNestedResultJson,
} from "../../../lib/cron-api-handler";

/** @deprecated Use POST /api/cron/jobs/networth-snapshot/run */
export async function GET(request: NextRequest) {
  return POST(request);
}

/** @deprecated Use POST /api/cron/jobs/networth-snapshot/run */
export async function POST(request: NextRequest) {
  return handleCronApiRoute(request, {
    jobSlugs: ["networth_snapshot"],
    triggerSource: "LEGACY",
    successMessage: "Net worth snapshot recording completed",
    errorLogLabel: "/api/cron/record-networth-snapshot",
    formatResponse(result) {
      const job = getJobRun(result, "networth_snapshot");
      return {
        batchRunId: result.batchRunId,
        result: unwrapNestedResultJson(job?.resultJson ?? null),
      };
    },
    isSuccess(result) {
      const job = getJobRun(result, "networth_snapshot");
      return Boolean(job && job.status !== "FAILED");
    },
    failureStatus: 500,
  });
}
