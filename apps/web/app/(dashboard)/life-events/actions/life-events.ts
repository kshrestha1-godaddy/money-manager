"use server";

import { revalidatePath } from "next/cache";
import prisma from "@repo/db/client";
import { LifeEventCategory } from "@prisma/client";
import { getVerifiedUserIdForDataAccess } from "../../../utils/auth";
import type { LifeEventItem } from "../../../types/life-event";
import { getLifeEventCsvField } from "../../../utils/lifeEventsCsv";
import { normalizeExternalLink, parseDateInputToUtcNoon, parseTagsInput } from "../life-event-helpers";
import { verifyUserAppLockPassword } from "../../../lib/security/app-lock-password";

function mapRow(row: {
  id: number;
  eventDate: Date;
  eventEndDate: Date | null;
  title: string;
  description: string | null;
  location: string | null;
  category: LifeEventCategory;
  tags: string[];
  externalLink: string | null;
  createdAt: Date;
  updatedAt: Date;
}): LifeEventItem {
  return {
    id: row.id,
    eventDate: new Date(row.eventDate),
    eventEndDate: row.eventEndDate ? new Date(row.eventEndDate) : null,
    title: row.title,
    description: row.description,
    location: row.location,
    category: row.category,
    tags: row.tags ?? [],
    externalLink: row.externalLink,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export async function getLifeEvents(): Promise<LifeEventItem[]> {
  const userId = await getVerifiedUserIdForDataAccess();
  const rows = await prisma.lifeEvent.findMany({
    where: { userId },
    orderBy: [{ eventDate: "desc" }, { id: "desc" }],
  });
  return rows.map(mapRow);
}

function parseOptionalEndDate(raw: string | undefined): Date | null {
  const t = raw?.trim();
  if (!t) return null;
  return parseDateInputToUtcNoon(t);
}

export async function createLifeEvent(form: {
  title: string;
  eventDate: string;
  eventEndDate: string;
  description: string;
  location: string;
  category: LifeEventCategory;
  tags: string;
  externalLink: string;
}): Promise<{ ok: true } | { error: string }> {
  try {
    const userId = await getVerifiedUserIdForDataAccess();
    const title = form.title.trim();
    if (!title) return { error: "Title is required" };
    if (!form.eventDate?.trim()) return { error: "Date is required" };

    const tags = parseTagsInput(form.tags);
    const externalLink = normalizeExternalLink(form.externalLink);
    const start = parseDateInputToUtcNoon(form.eventDate.trim());
    const end = parseOptionalEndDate(form.eventEndDate);
    if (end && end.getTime() < start.getTime()) {
      return { error: "End date must be on or after the start date" };
    }

    await prisma.lifeEvent.create({
      data: {
        userId,
        title,
        eventDate: start,
        eventEndDate: end,
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        category: form.category,
        tags,
        externalLink,
      },
    });
    revalidatePath("/life-events");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { error: e instanceof Error ? e.message : "Failed to create life event" };
  }
}

export async function updateLifeEvent(
  id: number,
  form: {
    title: string;
    eventDate: string;
    eventEndDate: string;
    description: string;
    location: string;
    category: LifeEventCategory;
    tags: string;
    externalLink: string;
  }
): Promise<{ ok: true } | { error: string }> {
  try {
    const userId = await getVerifiedUserIdForDataAccess();
    const title = form.title.trim();
    if (!title) return { error: "Title is required" };
    if (!form.eventDate?.trim()) return { error: "Date is required" };

    const tags = parseTagsInput(form.tags);
    const externalLink = normalizeExternalLink(form.externalLink);
    const start = parseDateInputToUtcNoon(form.eventDate.trim());
    const end = parseOptionalEndDate(form.eventEndDate);
    if (end && end.getTime() < start.getTime()) {
      return { error: "End date must be on or after the start date" };
    }

    const result = await prisma.lifeEvent.updateMany({
      where: { id, userId },
      data: {
        title,
        eventDate: start,
        eventEndDate: end,
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        category: form.category,
        tags,
        externalLink,
      },
    });
    if (result.count === 0) return { error: "Event not found" };
    revalidatePath("/life-events");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { error: e instanceof Error ? e.message : "Failed to update life event" };
  }
}

export async function deleteLifeEvent(id: number): Promise<{ ok: true } | { error: string }> {
  try {
    const userId = await getVerifiedUserIdForDataAccess();
    const result = await prisma.lifeEvent.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) return { error: "Event not found" };
    revalidatePath("/life-events");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { error: e instanceof Error ? e.message : "Failed to delete life event" };
  }
}

export async function deleteLifeEvents(
  ids: number[]
): Promise<{ ok: true; deleted: number } | { error: string }> {
  try {
    const userId = await getVerifiedUserIdForDataAccess();
    const unique = [...new Set(ids)].filter((id) => Number.isFinite(id) && id > 0);
    if (unique.length === 0) return { error: "No events selected" };

    const result = await prisma.lifeEvent.deleteMany({
      where: { userId, id: { in: unique } },
    });
    revalidatePath("/life-events");
    return { ok: true, deleted: result.count };
  } catch (e) {
    console.error(e);
    return { error: e instanceof Error ? e.message : "Failed to delete life events" };
  }
}

export async function deleteLifeEventsWithPassword(
  ids: number[],
  screenLockPassword: string
): Promise<{ ok: true; deleted: number } | { error: string }> {
  try {
    const userId = await getVerifiedUserIdForDataAccess();
    const isPasswordValid = await verifyUserAppLockPassword(userId, screenLockPassword);
    if (!isPasswordValid) {
      return { error: "Incorrect screen lock password" };
    }
    return deleteLifeEvents(ids);
  } catch (e) {
    console.error(e);
    return { error: e instanceof Error ? e.message : "Failed to delete life events" };
  }
}

const LIFE_EVENT_CATEGORY_SET = new Set<string>(Object.values(LifeEventCategory));

function isLifeEventCategory(value: string): value is LifeEventCategory {
  return LIFE_EVENT_CATEGORY_SET.has(value);
}

function isBlankLifeEventCsvRow(row: Record<string, string>): boolean {
  return Object.values(row).every((v) => !String(v ?? "").trim());
}

function normalizeLifeEventImportRow(
  row: Record<string, string>
):
  | {
      ok: true;
      rowId: number | null;
      form: {
        title: string;
        eventDate: string;
        eventEndDate: string;
        description: string;
        location: string;
        category: LifeEventCategory;
        tags: string;
        externalLink: string;
      };
    }
  | { ok: false; error: string } {
  const title = getLifeEventCsvField(row, "title").trim();
  if (!title) return { ok: false, error: "Title is required" };

  const eventDate = getLifeEventCsvField(row, "event_date", "eventdate").trim();
  if (!eventDate) return { ok: false, error: "event_date is required" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    return { ok: false, error: "event_date must be YYYY-MM-DD" };
  }

  const eventEndRaw = getLifeEventCsvField(row, "event_end_date", "eventenddate").trim();
  if (eventEndRaw && !/^\d{4}-\d{2}-\d{2}$/.test(eventEndRaw)) {
    return { ok: false, error: "event_end_date must be YYYY-MM-DD or empty" };
  }

  const categoryStr = getLifeEventCsvField(row, "category").trim();
  if (!categoryStr) return { ok: false, error: "category is required" };
  if (!isLifeEventCategory(categoryStr)) {
    return { ok: false, error: `Invalid category: ${categoryStr}` };
  }

  const idStr = getLifeEventCsvField(row, "id").trim();
  let rowId: number | null = null;
  if (idStr) {
    const n = parseInt(idStr, 10);
    if (!Number.isFinite(n) || n <= 0) {
      return { ok: false, error: "id must be a positive integer when set" };
    }
    rowId = n;
  }

  return {
    ok: true,
    rowId,
    form: {
      title,
      eventDate,
      eventEndDate: eventEndRaw,
      description: getLifeEventCsvField(row, "description").trim(),
      location: getLifeEventCsvField(row, "location").trim(),
      category: categoryStr,
      tags: getLifeEventCsvField(row, "tags").trim(),
      externalLink: getLifeEventCsvField(row, "external_link", "externallink").trim(),
    },
  };
}

export interface LifeEventImportRowError {
  /** 1-based line number in the file (header is line 1). */
  rowNumber: number;
  message: string;
}

export async function importLifeEvents(
  rows: Record<string, string>[]
): Promise<
  | {
      ok: true;
      created: number;
      updated: number;
      skipped: number;
      errors: LifeEventImportRowError[];
    }
  | { error: string }
> {
  try {
    await getVerifiedUserIdForDataAccess();
    if (!rows.length) return { error: "No data rows in file" };

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: LifeEventImportRowError[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      if (isBlankLifeEventCsvRow(row)) {
        skipped++;
        continue;
      }

      const parsed = normalizeLifeEventImportRow(row);
      if (!parsed.ok) {
        errors.push({ rowNumber: i + 2, message: parsed.error });
        continue;
      }

      const { rowId, form } = parsed;

      if (rowId) {
        const up = await updateLifeEvent(rowId, form);
        if ("error" in up && up.error) {
          if (up.error === "Event not found") {
            const cr = await createLifeEvent(form);
            if ("error" in cr && cr.error) {
              errors.push({ rowNumber: i + 2, message: cr.error });
            } else {
              created++;
            }
          } else {
            errors.push({ rowNumber: i + 2, message: up.error });
          }
        } else {
          updated++;
        }
      } else {
        const cr = await createLifeEvent(form);
        if ("error" in cr && cr.error) {
          errors.push({ rowNumber: i + 2, message: cr.error });
        } else {
          created++;
        }
      }
    }

    revalidatePath("/life-events");
    return { ok: true, created, updated, skipped, errors };
  } catch (e) {
    console.error(e);
    return { error: e instanceof Error ? e.message : "Failed to import life events" };
  }
}
