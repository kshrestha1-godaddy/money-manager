import prisma from "@repo/db/client";
import { sendWeeklyDataExportEmail } from "./email";
import { buildWeeklyUserExportAttachments } from "./weekly-user-export-bundle";

export interface WeeklyDataExportEmailResult {
  eligibleUsers: number;
  emailsAttempted: number;
  emailsSent: number;
  skipped: number;
  errors: string[];
}

/**
 * Weekly CSV backup emails. Run from the existing daily cron on the configured weekday only.
 *
 * Recipients: users with a non-empty `email`. If `WEEKLY_EXPORT_REQUIRE_EMAIL_OPT_IN=true`, only users
 * with `notificationSettings.emailNotifications === true` receive mail.
 */
export async function processWeeklyDataExportEmails(
  exportDateStr?: string
): Promise<WeeklyDataExportEmailResult> {
  const errors: string[] = [];
  let emailsAttempted = 0;
  let emailsSent = 0;
  let skipped = 0;

  if (process.env.WEEKLY_DATA_EXPORT_ENABLED === "false") {
    return {
      eligibleUsers: 0,
      emailsAttempted: 0,
      emailsSent: 0,
      skipped: 0,
      errors: ["WEEKLY_DATA_EXPORT_DISABLED"],
    };
  }

  const requireOptIn = process.env.WEEKLY_EXPORT_REQUIRE_EMAIL_OPT_IN === "true";

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
        continue;
      }

      const send = await sendWeeklyDataExportEmail({
        to: email,
        userName: user.name ?? undefined,
        attachmentCount: attachments.length,
        attachments,
      });

      if (send.success) {
        emailsSent += 1;
      } else {
        errors.push(`user ${user.id}: ${send.error ?? "send failed"}`);
      }
    } catch (e) {
      errors.push(
        `user ${user.id}: ${e instanceof Error ? e.message : "unknown error"}`
      );
    }
  }

  return {
    eligibleUsers: eligible.length,
    emailsAttempted,
    emailsSent,
    skipped,
    errors: errors.slice(0, 25),
  };
}
