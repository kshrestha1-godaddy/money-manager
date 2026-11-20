import { NextRequest } from "next/server";
import { handleCronApiRoute } from "../../../lib/cron-api-handler";

export async function POST(request: NextRequest) {
  return handleCronApiRoute(request, {
    triggerSource: "API_ALL",
    successMessage: "Cron batch completed",
    errorLogLabel: "/api/cron/run",
  });
}
