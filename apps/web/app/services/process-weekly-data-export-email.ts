import prisma from "@repo/db/client";
import { sendWeeklyDataExportEmail } from "./email";
import { buildWeeklyUserExportAttachments } from "./weekly-user-export-bundle";
import { createCronLogCollector, type CronLogEntry } from "./cron/cron-log-types";

export interface WeeklyDataExportEmailResult {
  eligibleUsers: number;
  emailsAttempted: number;
  emailsSent: number;
  skipped: number;
  errors: string[];
  logs: CronLogEntry[];
}

/**
 * Weekly CSV backup emails. Invoked only via the cron orchestrator (gates apply there).
 *
 * Recipients: users with a non-empty `email`. If `WEEKLY_EXPORT_REQUIRE_EMAIL_OPT_IN=true`, only users
 * with `notificationSettings.emailNotifications === true` receive mail.
 */
export async function processWeeklyDataExportEmails(
  exportDateStr?: string
): Promise<WeeklyDataExportEmailResult> {
  const log = createCronLogCollector();
  const errors: string[] = [];
  let emailsAttempted = 0;
  let emailsSent = 0;
  let skipped = 0;

  const requireOptIn = process.env.WEEKLY_EXPORT_REQUIRE_EMAIL_OPT_IN === "true";
  log.info("Starting weekly data export email job", {
    details: { requireOptIn, exportDateStr: exportDateStr ?? null },
  });

  const users = await prisma.user.findMany({
    where: {
      email: { not: null },
      NOT: { email: "" },
    },
    select: {
      id: true,
      email: true,
      name: true,
      notificationSettings: { select: { emailNotifications: true } },
    },
  });

  const eligible = users.filter((u) => {
    if (!u.email?.trim()) return false;
    if (requireOptIn && !u.notificationSettings?.emailNotifications) return false;
    return true;
  });

  log.info(`Found ${eligible.length} eligible users for weekly export`, {
    details: { totalUsers: users.length, eligibleUsers: eligible.length },
  });

  for (const user of eligible) {
    const email = user.email!.trim();
    try {
      emailsAttempted += 1;
      const attachments = await buildWeeklyUserExportAttachments(
        user.id,
        exportDateStr
      );
      if (attachments.length === 0) {
        skipped += 1;
        log.skip("No export data available for user", {
          userId: user.id,
          email,
        });
        continue;
      }

      log.info("Sending weekly data export email", {
        userId: user.id,
        email,
        details: { attachmentCount: attachments.length },
      });

      const send = await sendWeeklyDataExportEmail({
        to: email,
        userName: user.name ?? undefined,
        attachmentCount: attachments.length,
        attachments,
      });

      if (send.success) {
        emailsSent += 1;
        log.success("Weekly data export email sent", {
          userId: user.id,
          email,
          details: { attachmentCount: attachments.length },
        });
      } else {
        errors.push(`user ${user.id}: ${send.error ?? "send failed"}`);
        log.error(`Failed to send weekly export: ${send.error ?? "send failed"}`, {
          userId: user.id,
          email,
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "unknown error";
      errors.push(`user ${user.id}: ${message}`);
      log.error(`Error processing weekly export: ${message}`, {
        userId: user.id,
        email,
      });
    }
  }

  log.info("Weekly data export job finished", {
    details: { eligibleUsers: eligible.length, emailsAttempted, emailsSent, skipped, errorCount: errors.length },
  });

  return {
    eligibleUsers: eligible.length,
    emailsAttempted,
    emailsSent,
    skipped,
    errors: errors.slice(0, 25),
    logs: log.logs,
  };
}
