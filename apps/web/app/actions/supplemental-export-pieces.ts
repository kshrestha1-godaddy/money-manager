"use server";

import prisma from "@repo/db/client";
import { arrayToCSV } from "../utils/csv/csvExportCore";
import { convertBudgetTargetsToCSV } from "../utils/csvExportBudgetTargets";
import type { BudgetTarget } from "../types/financial";
import { getVerifiedUserIdForDataAccess } from "../utils/auth";
import { sanitizeExportDateStrForFilename } from "../utils/exportFilename";
import {
  SUPPLEMENTAL_EXPORT_PIECE_SET,
  type SupplementalExportPiece,
  type SupplementalExportPieceResult,
} from "./supplemental-export-pieces.shared";

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

function yn(b: boolean): string {
  return b ? "Yes" : "No";
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
 * One table per server action so the payload stays under Next.js server-action limits.
 * Client should call once per piece and trigger a download for each response.
 */
export async function fetchSupplementalExportPiece(
  piece: SupplementalExportPiece,
  dateStr: string
): Promise<SupplementalExportPieceResult> {
  if (!SUPPLEMENTAL_EXPORT_PIECE_SET.has(piece)) {
    return { error: "Invalid export" };
  }
  const safeDate = sanitizeExportDateStrForFilename(dateStr);
  const filename = `${piece}_${safeDate}.csv`;

  try {
    const userId = await getVerifiedUserIdForDataAccess();

    switch (piece) {
      case "user_profile": {
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            number: true,
            currency: true,
            timezone: true,
            profilePictureUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        if (!u) {
          return { error: "User record not found" };
        }
        const headers = [
          "ID",
          "Email",
          "Name",
          "Number",
          "Currency",
          "Timezone",
          "Profile Picture URL",
          "Created At",
          "Updated At",
        ];
        const row: (string | number)[] = [
          u.id,
          u.email ?? "",
          u.name ?? "",
          u.number,
          u.currency,
          u.timezone,
          u.profilePictureUrl ?? "",
          iso(u.createdAt),
          iso(u.updatedAt),
        ];
        return { csv: csvTable(headers, [row]), filename };
      }

      case "transaction_locations": {
        const rows = await prisma.transactionLocation.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        const headers = ["ID", "Latitude", "Longitude", "Created At", "Updated At"];
        const body = rows.map((r) => [
          r.id,
          dec(r.latitude),
          dec(r.longitude),
          iso(r.createdAt),
          iso(r.updatedAt),
        ]);
        return { csv: csvTable(headers, body), filename };
      }

      case "saved_locations": {
        const rows = await prisma.savedLocation.findMany({
          where: { userId },
          orderBy: { name: "asc" },
        });
        const headers = ["ID", "Name", "Latitude", "Longitude", "Created At", "Updated At"];
        const body = rows.map((r) => [
          r.id,
          r.name,
          dec(r.latitude),
          dec(r.longitude),
          iso(r.createdAt),
          iso(r.updatedAt),
        ]);
        return { csv: csvTable(headers, body), filename };
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

      case "loans": {
        const rows = await prisma.loan.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        const headers = [
          "ID",
          "Lender Name",
          "Lender Contact",
          "Lender Email",
          "Amount",
          "Interest Rate",
          "Due Date",
          "Taken Date",
          "Status",
          "Purpose",
          "Notes",
          "Account ID",
          "User ID",
          "Created At",
          "Updated At",
        ];
        const body = rows.map((l) => [
          l.id,
          l.lenderName,
          l.lenderContact ?? "",
          l.lenderEmail ?? "",
          dec(l.amount),
          dec(l.interestRate),
          iso(l.dueDate),
          iso(l.takenDate),
          l.status,
          l.purpose ?? "",
          l.notes ?? "",
          l.accountId ?? "",
          l.userId,
          iso(l.createdAt),
          iso(l.updatedAt),
        ]);
        return { csv: csvTable(headers, body), filename };
      }

      case "loan_repayments": {
        const rows = await prisma.loanRepayment.findMany({
          where: { loan: { userId } },
          orderBy: { repaymentDate: "desc" },
        });
        const headers = [
          "ID",
          "Loan ID",
          "Amount",
          "Repayment Date",
          "Notes",
          "Account ID",
          "Created At",
          "Updated At",
        ];
        const body = rows.map((r) => [
          r.id,
          r.loanId,
          dec(r.amount),
          iso(r.repaymentDate),
          r.notes ?? "",
          r.accountId ?? "",
          iso(r.createdAt),
          iso(r.updatedAt),
        ]);
        return { csv: csvTable(headers, body), filename };
      }

      case "notifications": {
        const rows = await prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        const headers = [
          "ID",
          "Title",
          "Message",
          "Type",
          "Priority",
          "Is Read",
          "Action URL",
          "Metadata (JSON)",
          "User ID",
          "Created At",
          "Updated At",
        ];
        const body = rows.map((n) => [
          n.id,
          n.title,
          n.message,
          n.type,
          n.priority,
          yn(n.isRead),
          n.actionUrl ?? "",
          jsonCell(n.metadata),
          n.userId,
          iso(n.createdAt),
          iso(n.updatedAt),
        ]);
        return { csv: csvTable(headers, body), filename };
      }

      case "dismissed_notifications": {
        const rows = await prisma.dismissedNotification.findMany({
          where: { userId },
          orderBy: { dismissedAt: "desc" },
        });
        const headers = ["ID", "User ID", "Notification Type", "Entity ID", "Dismissed At"];
        const body = rows.map((d) => [
          d.id,
          d.userId,
          d.notificationType,
          d.entityId,
          iso(d.dismissedAt),
        ]);
        return { csv: csvTable(headers, body), filename };
      }

      case "notification_settings": {
        const rows = await prisma.notificationSettings.findMany({ where: { userId } });
        const headers = [
          "ID",
          "User ID",
          "Low Balance Enabled",
          "Low Balance Threshold",
          "Due Date Enabled",
          "Due Date Days Before",
          "Spending Alerts Enabled",
          "Monthly Spending Limit",
          "Investment Alerts Enabled",
          "Auto Bookmark Enabled",
          "High Value Income Threshold",
          "High Value Expense Threshold",
          "Email Notifications",
          "Push Notifications",
          "Created At",
          "Updated At",
        ];
        const body = rows.map((s) => [
          s.id,
          s.userId,
          yn(s.lowBalanceEnabled),
          dec(s.lowBalanceThreshold),
          yn(s.dueDateEnabled),
          s.dueDateDaysBefore,
          yn(s.spendingAlertsEnabled),
          dec(s.monthlySpendingLimit),
          yn(s.investmentAlertsEnabled),
          yn(s.autoBookmarkEnabled),
          dec(s.highValueIncomeThreshold),
          dec(s.highValueExpenseThreshold),
          yn(s.emailNotifications),
          yn(s.pushNotifications),
          iso(s.createdAt),
          iso(s.updatedAt),
        ]);
        return { csv: csvTable(headers, body), filename };
      }

      case "account_thresholds": {
        const rows = await prisma.accountThreshold.findMany({
          where: { userId },
          orderBy: { accountId: "asc" },
        });
        const headers = [
          "ID",
          "Account ID",
          "User ID",
          "Low Balance Threshold",
          "Created At",
          "Updated At",
        ];
        const body = rows.map((t) => [
          t.id,
          t.accountId,
          t.userId,
          dec(t.lowBalanceThreshold),
          iso(t.createdAt),
          iso(t.updatedAt),
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

      case "user_checkins": {
        const rows = await prisma.userCheckin.findMany({
          where: { userId },
          orderBy: { checkinAt: "desc" },
        });
        const headers = ["ID", "User ID", "Checkin At", "IP Address", "User Agent"];
        const body = rows.map((c) => [
          c.id,
          c.userId,
          iso(c.checkinAt),
          c.ipAddress ?? "",
          c.userAgent ?? "",
        ]);
        return { csv: csvTable(headers, body), filename };
      }

      case "emergency_emails": {
        const rows = await prisma.emergencyEmail.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        const headers = ["ID", "Email", "Label", "User ID", "Is Active", "Created At", "Updated At"];
        const body = rows.map((e) => [
          e.id,
          e.email,
          e.label ?? "",
          e.userId,
          yn(e.isActive),
          iso(e.createdAt),
          iso(e.updatedAt),
        ]);
        return { csv: csvTable(headers, body), filename };
      }

      case "password_shares": {
        const rows = await prisma.passwordShare.findMany({
          where: { userId },
          orderBy: { sentAt: "desc" },
        });
        const headers = [
          "ID",
          "User ID",
          "Recipient Email",
          "Sent At",
          "Password Count",
          "Share Reason",
          "Secret Key",
          "Expires At",
        ];
        const body = rows.map((p) => [
          p.id,
          p.userId,
          p.recipientEmail,
          iso(p.sentAt),
          p.passwordCount,
          p.shareReason,
          p.secretKey ?? "",
          iso(p.expiresAt),
        ]);
        return { csv: csvTable(headers, body), filename };
      }

      case "net_worth_inclusions": {
        const rows = await prisma.netWorthInclusion.findMany({
          where: { userId },
          orderBy: { entityType: "asc" },
        });
        const headers = [
          "ID",
          "User ID",
          "Entity Type",
          "Entity ID",
          "Include In Net Worth",
          "Created At",
          "Updated At",
        ];
        const body = rows.map((n) => [
          n.id,
          n.userId,
          n.entityType,
          n.entityId,
          yn(n.includeInNetWorth),
          iso(n.createdAt),
          iso(n.updatedAt),
        ]);
        return { csv: csvTable(headers, body), filename };
      }

      case "activity_logs": {
        const rows = await prisma.activityLog.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
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
          orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        });
        const headers = [
          "ID",
          "Title",
          "Content",
          "Color",
          "Is Pinned",
          "Is Archived",
          "Tags",
          "Image URL",
          "Related Expense ID",
          "Related Income ID",
          "Related Investment ID",
          "Related Debt ID",
          "Related Loan ID",
          "Related Account ID",
          "Amount",
          "Currency",
          "Note Date",
          "Reminder Date",
          "User ID",
          "Created At",
          "Updated At",
        ];
        const body = rows.map((n) => [
          n.id,
          n.title,
          n.content ?? "",
          n.color,
          yn(n.isPinned),
          yn(n.isArchived),
          n.tags.join("; "),
          n.imageUrl ?? "",
          n.relatedExpenseId ?? "",
          n.relatedIncomeId ?? "",
          n.relatedInvestmentId ?? "",
          n.relatedDebtId ?? "",
          n.relatedLoanId ?? "",
          n.relatedAccountId ?? "",
          dec(n.amount),
          n.currency,
          iso(n.noteDate),
          iso(n.reminderDate),
          n.userId,
          iso(n.createdAt),
          iso(n.updatedAt),
        ]);
        return { csv: csvTable(headers, body), filename };
      }

      case "chat_threads": {
        const rows = await prisma.chatThread.findMany({
          where: { userId },
          orderBy: [{ isPinned: "desc" }, { lastMessageAt: "desc" }],
        });
        const headers = [
          "ID",
          "Title",
          "Description",
          "Is Active",
          "Is Pinned",
          "Last Message At",
          "User ID",
          "Created At",
          "Updated At",
        ];
        const body = rows.map((t) => [
          t.id,
          t.title,
          t.description ?? "",
          yn(t.isActive),
          yn(t.isPinned),
          iso(t.lastMessageAt),
          t.userId,
          iso(t.createdAt),
          iso(t.updatedAt),
        ]);
        return { csv: csvTable(headers, body), filename };
      }

      case "chat_conversations": {
        const rows = await prisma.chatConversation.findMany({
          where: { thread: { userId } },
          orderBy: [{ threadId: "asc" }, { createdAt: "asc" }],
        });
        const headers = [
          "ID",
          "Thread ID",
          "Content",
          "Sender",
          "Message Type",
          "Is Processing",
          "Processing Steps",
          "Attachments (JSON)",
          "Intermediate Steps (JSON)",
          "System Prompt (JSON)",
          "Input Tokens",
          "Output Tokens",
          "Feedback",
          "Comments",
          "Response Time Seconds",
          "Token Count",
          "Created At",
          "Updated At",
        ];
        const body = rows.map((c) => [
          c.id,
          c.threadId,
          c.content,
          c.sender,
          c.messageType,
          yn(c.isProcessing),
          c.processingSteps,
          jsonCell(c.attachments),
          jsonCell(c.intermediateSteps),
          jsonCell(c.systemPrompt),
          c.inputTokens ?? "",
          c.outputTokens ?? "",
          c.feedback ?? "",
          c.comments ?? "",
          c.responseTimeSeconds ?? "",
          c.tokenCount ?? "",
          iso(c.createdAt),
          iso(c.updatedAt),
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

      case "transaction_images": {
        const rows = await prisma.transactionImage.findMany({
          where: { userId },
          orderBy: { uploadedAt: "desc" },
        });
        const headers = [
          "ID",
          "Image URL",
          "File Name",
          "File Size",
          "MIME Type",
          "Transaction Type",
          "Transaction ID",
          "Description",
          "Is Active",
          "Uploaded At",
          "User ID",
          "Created At",
          "Updated At",
        ];
        const body = rows.map((i) => [
          i.id,
          i.imageUrl,
          i.fileName,
          i.fileSize ?? "",
          i.mimeType ?? "",
          i.transactionType,
          i.transactionId,
          i.description ?? "",
          yn(i.isActive),
          iso(i.uploadedAt),
          i.userId,
          iso(i.createdAt),
          iso(i.updatedAt),
        ]);
        return { csv: csvTable(headers, body), filename };
      }

      case "goals": {
        const rows = await prisma.goal.findMany({
          where: { userId },
          orderBy: [{ priority: "asc" }, { startDate: "asc" }],
        });
        const headers = [
          "ID",
          "Title",
          "Description",
          "Target Amount",
          "Current Amount",
          "Currency",
          "Start Date",
          "Target Completion Date",
          "Actual Completion Date",
          "Priority",
          "Status",
          "Category",
          "Tags",
          "Color",
          "Notes",
          "Success Criteria",
          "Account ID",
          "Risk Level",
          "Is Public",
          "User ID",
          "Created At",
          "Updated At",
        ];
        const body = rows.map((g) => [
          g.id,
          g.title,
          g.description ?? "",
          dec(g.targetAmount),
          dec(g.currentAmount),
          g.currency,
          iso(g.startDate),
          iso(g.targetCompletionDate),
          iso(g.actualCompletionDate),
          g.priority,
          g.status,
          g.category ?? "",
          g.tags.join("; "),
          g.color,
          g.notes ?? "",
          g.successCriteria ?? "",
          g.accountId ?? "",
          g.riskLevel,
          yn(g.isPublic),
          g.userId,
          iso(g.createdAt),
          iso(g.updatedAt),
        ]);
        return { csv: csvTable(headers, body), filename };
      }

      case "goal_phases": {
        const rows = await prisma.goalPhase.findMany({
          where: { userId },
          orderBy: [{ goalId: "asc" }, { sequenceOrder: "asc" }],
        });
        const headers = [
          "ID",
          "Goal ID",
          "User ID",
          "Name",
          "Description",
          "Planned Start Date",
          "Planned End Date",
          "Actual Start Date",
          "Actual End Date",
          "Status",
          "Progress %",
          "Sequence Order",
          "Estimated Duration (days)",
          "Actual Duration (days)",
          "Notes",
          "Requirements",
          "Deliverables",
          "Created At",
          "Updated At",
        ];
        const body = rows.map((p) => [
          p.id,
          p.goalId,
          p.userId,
          p.name,
          p.description ?? "",
          iso(p.plannedStartDate),
          iso(p.plannedEndDate),
          iso(p.actualStartDate),
          iso(p.actualEndDate),
          p.status,
          p.progressPercentage,
          p.sequenceOrder,
          p.estimatedDuration ?? "",
          p.actualDuration ?? "",
          p.notes ?? "",
          p.requirements ?? "",
          p.deliverables ?? "",
          iso(p.createdAt),
          iso(p.updatedAt),
        ]);
        return { csv: csvTable(headers, body), filename };
      }

      case "goal_progress": {
        const rows = await prisma.goalProgress.findMany({
          where: { userId },
          orderBy: [{ goalId: "asc" }, { progressDate: "desc" }],
        });
        const headers = [
          "ID",
          "Goal ID",
          "User ID",
          "Phase ID",
          "Progress %",
          "Amount Progress",
          "Milestone Reached",
          "Notes",
          "Challenges",
          "Next Steps",
          "Progress Date",
          "Is Automatic Update",
          "Created At",
          "Updated At",
        ];
        const body = rows.map((pr) => [
          pr.id,
          pr.goalId,
          pr.userId,
          pr.phaseId ?? "",
          pr.progressPercentage,
          dec(pr.amountProgress),
          pr.milestoneReached ?? "",
          pr.notes ?? "",
          pr.challenges ?? "",
          pr.nextSteps ?? "",
          iso(pr.progressDate),
          yn(pr.isAutomaticUpdate),
          iso(pr.createdAt),
          iso(pr.updatedAt),
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
    console.error("fetchSupplementalExportPiece", piece, e);
    return {
      error: e instanceof Error ? e.message : "Export piece failed",
    };
  }
}
