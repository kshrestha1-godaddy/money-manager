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
        const headers = [
          "ID",
          "Title",
          "URL",
          "Description",
          "Category",
          "Favicon",
          "Tags",
          "User ID",
          "Created At",
          "Updated At",
        ];
        const body = rows.map((b) => [
          b.id,
          b.title,
          b.url,
          b.description ?? "",
          b.category ?? "",
          b.favicon ?? "",
          b.tags.join("; "),
          b.userId,
          iso(b.createdAt),
          iso(b.updatedAt),
        ]);
        return { csv: csvTable(headers, body), filename };
      }

      case "transaction_bookmarks": {
        const rows = await prisma.transactionBookmark.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        const headers = [
          "ID",
          "Transaction Type",
          "Transaction ID",
          "Title",
          "Description",
          "Notes",
          "Tags",
          "User ID",
          "Created At",
          "Updated At",
        ];
        const body = rows.map((b) => [
          b.id,
          b.transactionType,
          b.transactionId,
          b.title,
          b.description ?? "",
          b.notes ?? "",
          b.tags.join("; "),
          b.userId,
          iso(b.createdAt),
          iso(b.updatedAt),
        ]);
        return { csv: csvTable(headers, body), filename };
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
