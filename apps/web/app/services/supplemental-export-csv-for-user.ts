import prisma from "@repo/db/client";
import { arrayToCSV } from "../utils/csv/csvExportCore";
import { convertBudgetTargetsToCSV } from "../utils/csvExportBudgetTargets";
import type { BudgetTarget } from "../types/financial";
import type { SupplementalExportPiece } from "../actions/supplemental-export-pieces.shared";

export interface SupplementalExportCsvOptions {
  /** Cap activity log rows for large mail payloads (e.g. weekly email). Omit for full export. */
  activityLogTake?: number;
}

function iso(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString();
}

function dec(v: { toString(): string } | null | undefined): string {
  if (v == null) return "";
  return v.toString();
}

function jsonCell(v: unknown): string {
  if (v == null) return "";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function csvTable(headers: string[], rows: (string | number)[][]): string {
  if (rows.length === 0) {
    return arrayToCSV([headers]);
  }
  return arrayToCSV([headers, ...rows]);
}

function isDecimalLike(v: unknown): v is { toString(): string } {
  return (
    typeof v === "object" &&
    v !== null &&
    "toString" in v &&
    typeof (v as { toString: unknown }).toString === "function" &&
    (v as { constructor?: { name?: string } }).constructor?.name === "Decimal"
  );
}

function formatCsvValue(v: unknown): string | number {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return jsonCell(v);
  if (isDecimalLike(v)) return v.toString();
  if (typeof v === "object") return jsonCell(v);
  return String(v);
}

function collectHeaders(rows: Record<string, unknown>[]): string[] {
  const headers: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue;
      seen.add(key);
      headers.push(key);
    }
  }
  return headers;
}

function csvFromRecords(rows: Record<string, unknown>[], headers?: string[]): string {
  const resolvedHeaders = headers ?? collectHeaders(rows);
  if (resolvedHeaders.length === 0) return "";
  const body = rows.map((row) =>
    resolvedHeaders.map((header) => formatCsvValue(row[header]))
  );
  return csvTable(resolvedHeaders, body);
}

async function categoryTypeMapForUser(userId: number): Promise<Map<string, string>> {
  const categories = await prisma.category.findMany({
    where: { userId },
    select: { name: true, type: true },
  });
  return new Map(categories.map((c) => [c.name, c.type]));
}

/**
 * Build supplemental table CSV for a user (cron / email). No session — caller must enforce userId.
 */
export async function buildSupplementalExportCsvForUser(
  piece: SupplementalExportPiece,
  userId: number,
  dateStr: string,
  options?: SupplementalExportCsvOptions
): Promise<{ csv: string; filename: string } | { error: string }> {
  const filename = `${piece}_${dateStr}.csv`;

  try {
    switch (piece) {
      case "user_profile": {
        const row = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            number: true,
            profilePictureUrl: true,
            currency: true,
            timezone: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        return {
          csv: csvFromRecords(row ? [row] : []),
          filename,
        };
      }

      case "budget_targets": {
        const [map, budgetTargets] = await Promise.all([
          categoryTypeMapForUser(userId),
          prisma.budgetTarget.findMany({
            where: { userId },
            orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
          }),
        ]);
        const formatted: (BudgetTarget & { categoryType?: string })[] = budgetTargets.map(
          (t) => ({
            id: t.id,
            name: t.name,
            targetAmount: parseFloat(t.targetAmount.toString()),
            currentAmount: parseFloat(t.currentAmount.toString()),
            period: t.period as BudgetTarget["period"],
            startDate: t.startDate,
            endDate: t.endDate,
            userId: t.userId,
            isActive: t.isActive,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            categoryType: map.get(t.name) ?? "UNKNOWN",
          })
        );
        if (formatted.length === 0) {
          return {
            csv: csvTable(
              [
                "ID",
                "Category Name",
                "Category Type",
                "Target Amount",
                "Current Amount",
                "Period",
                "Start Date",
                "End Date",
                "Status",
                "Progress (%)",
                "Variance",
                "Created At",
                "Updated At",
              ],
              []
            ),
            filename,
          };
        }
        return { csv: convertBudgetTargetsToCSV(formatted), filename };
      }

      case "bookmarks": {
        const rows = await prisma.bookmark.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "transaction_bookmarks": {
        const rows = await prisma.transactionBookmark.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "scheduled_payments": {
        const rows = await prisma.scheduledPayment.findMany({
          where: { userId },
          orderBy: { scheduledAt: "desc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "transaction_locations": {
        const rows = await prisma.transactionLocation.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "saved_locations": {
        const rows = await prisma.savedLocation.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "loans": {
        const rows = await prisma.loan.findMany({
          where: { userId },
          orderBy: { takenDate: "desc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "loan_repayments": {
        const rows = await prisma.loanRepayment.findMany({
          where: { loan: { userId } },
          orderBy: { repaymentDate: "desc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "notifications": {
        const rows = await prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "dismissed_notifications": {
        const rows = await prisma.dismissedNotification.findMany({
          where: { userId },
          orderBy: { dismissedAt: "desc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "notification_settings": {
        const rows = await prisma.notificationSettings.findMany({
          where: { userId },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "account_thresholds": {
        const rows = await prisma.accountThreshold.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "user_checkins": {
        const rows = await prisma.userCheckin.findMany({
          where: { userId },
          orderBy: { checkinAt: "desc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "emergency_emails": {
        const rows = await prisma.emergencyEmail.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "password_shares": {
        const rows = await prisma.passwordShare.findMany({
          where: { userId },
          orderBy: { sentAt: "desc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "networth_inclusions": {
        const rows = await prisma.netWorthInclusion.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "activity_logs": {
        const rows = await prisma.activityLog.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          ...(options?.activityLogTake != null
            ? { take: Math.min(Math.max(options.activityLogTake, 1), 50_000) }
            : {}),
        });
        const headers = [
          "ID",
          "User ID",
          "Action",
          "Entity Type",
          "Entity ID",
          "Description",
          "Metadata (JSON)",
          "IP Address",
          "User Agent",
          "Session ID",
          "Category",
          "Severity",
          "Status",
          "Error Message",
          "Duration (ms)",
          "Created At",
        ];
        const body = rows.map((a) => [
          a.id,
          a.userId ?? "",
          a.action,
          a.entityType,
          a.entityId ?? "",
          a.description,
          jsonCell(a.metadata),
          a.ipAddress ?? "",
          a.userAgent ?? "",
          a.sessionId ?? "",
          a.category,
          a.severity,
          a.status,
          a.errorMessage ?? "",
          a.duration ?? "",
          iso(a.createdAt),
        ]);
        return { csv: csvTable(headers, body), filename };
      }

      case "notes": {
        const rows = await prisma.note.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "chat_threads": {
        const rows = await prisma.chatThread.findMany({
          where: { userId },
          orderBy: { lastMessageAt: "desc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "chat_conversations": {
        const rows = await prisma.chatConversation.findMany({
          where: { thread: { userId } },
          orderBy: { createdAt: "asc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "networth_history": {
        const rows = await prisma.networthHistory.findMany({
          where: { userId },
          orderBy: { snapshotDate: "asc" },
        });
        const headers = [
          "ID",
          "Total Account Balance",
          "Total Investment Value",
          "Total Investment Cost",
          "Total Investment Gain",
          "Total Investment Gain %",
          "Total Money Lent",
          "Total Assets",
          "Net Worth",
          "Currency",
          "Snapshot Date",
          "Record Type",
          "User ID",
          "Created At",
          "Updated At",
        ];
        const body = rows.map((h) => [
          h.id,
          dec(h.totalAccountBalance),
          dec(h.totalInvestmentValue),
          dec(h.totalInvestmentCost),
          dec(h.totalInvestmentGain),
          dec(h.totalInvestmentGainPercentage),
          dec(h.totalMoneyLent),
          dec(h.totalAssets),
          dec(h.netWorth),
          h.currency,
          iso(h.snapshotDate),
          h.recordType,
          h.userId,
          iso(h.createdAt),
          iso(h.updatedAt),
        ]);
        return { csv: csvTable(headers, body), filename };
      }

      case "transaction_images": {
        const rows = await prisma.transactionImage.findMany({
          where: { userId },
          orderBy: { uploadedAt: "desc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "goals": {
        const rows = await prisma.goal.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "goal_phases": {
        const rows = await prisma.goalPhase.findMany({
          where: { userId },
          orderBy: [{ goalId: "asc" }, { sequenceOrder: "asc" }],
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "goal_progress": {
        const rows = await prisma.goalProgress.findMany({
          where: { userId },
          orderBy: [{ goalId: "asc" }, { progressDate: "asc" }],
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "annuity_calculator_presets": {
        const rows = await prisma.annuityCalculatorPreset.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "life_events": {
        const rows = await prisma.lifeEvent.findMany({
          where: { userId },
          orderBy: { eventDate: "asc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "user_app_lock_settings": {
        const rows = await prisma.userAppLockSetting.findMany({
          where: { userId },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "blood_pressure_readings": {
        const rows = await prisma.bloodPressureReading.findMany({
          where: { userId },
          orderBy: { measuredAt: "desc" },
        });
        return { csv: csvFromRecords(rows), filename };
      }

      case "investment_target_records": {
        const rows = await prisma.investmentTarget.findMany({
          where: { userId },
          orderBy: { investmentType: "asc" },
        });
        const headers = [
          "ID",
          "Investment Type",
          "Target Amount",
          "Target Completion Date",
          "Nickname",
          "User ID",
          "Created At",
          "Updated At",
        ];
        const body = rows.map((t) => [
          t.id,
          t.investmentType,
          dec(t.targetAmount),
          iso(t.targetCompletionDate),
          t.nickname ?? "",
          t.userId,
          iso(t.createdAt),
          iso(t.updatedAt),
        ]);
        return { csv: csvTable(headers, body), filename };
      }

      default: {
        const _exhaustive: never = piece;
        return { error: `Unknown export piece: ${_exhaustive}` };
      }
    }
  } catch (e) {
    console.error("buildSupplementalExportCsvForUser", piece, e);
    return {
      error: e instanceof Error ? e.message : "Export piece failed",
    };
  }
}
