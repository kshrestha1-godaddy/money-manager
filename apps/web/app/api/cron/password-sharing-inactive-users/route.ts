import { NextRequest } from "next/server";
import {
  getJobResultJson,
  handleCronApiRoute,
} from "../../../lib/cron-api-handler";

/** @deprecated Use POST /api/cron/jobs/inactive-password-share/run */
export async function GET(request: NextRequest) {
  return POST(request);
}

/** @deprecated Use POST /api/cron/jobs/inactive-password-share/run */
export async function POST(request: NextRequest) {
  return handleCronApiRoute(request, {
    jobSlugs: ["inactive_password_share"],
    triggerSource: "LEGACY",
    successMessage: "Password sharing for inactive users completed",
    errorLogLabel: "/api/cron/password-sharing-inactive-users",
    formatResponse(result) {
      return {
        batchRunId: result.batchRunId,
        result: getJobResultJson(result, "inactive_password_share"),
      };
    },
  });
}
