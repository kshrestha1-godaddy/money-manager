"use server";

import { revalidatePath } from "next/cache";
import prisma from "@repo/db/client";
import type { LifeEventCategory } from "@prisma/client";
import { getVerifiedUserIdForDataAccess } from "../../../utils/auth";
import type { LifeEventItem } from "../../../types/life-event";
import { normalizeExternalLink, parseDateInputToUtcNoon, parseTagsInput } from "../life-event-helpers";

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
