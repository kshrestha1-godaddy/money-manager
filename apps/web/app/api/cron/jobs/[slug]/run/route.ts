import { NextRequest } from "next/server";
import {
  getJobRun,
  handleCronApiRoute,
} from "../../../lib/cron-api-handler";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  return POST(request, context);
}

export async function POST(request: NextRequest, context: RouteParams) {
  const { slug } = await context.params;
  const jobSlug = slug.replace(/-/g, "_");

  return handleCronApiRoute(request, {
    jobSlugs: [jobSlug],
    triggerSource: "API_SINGLE",
    successMessage: `Cron job ${jobSlug} completed`,
    errorLogLabel: `/api/cron/jobs/${slug}/run`,
    formatResponse(result) {
      const job = getJobRun(result, jobSlug);
      return {
        batchRunId: result.batchRunId,
        status: result.status,
        job: job
          ? {
              jobSlug: job.jobSlug,
              status: job.status,
              skipReason: job.skipReason,
              durationMs: job.durationMs,
              counters: job.counters,
              resultJson: job.resultJson,
              errorMessage: job.errorMessage,
            }
          : null,
      };
    },
  });
}
