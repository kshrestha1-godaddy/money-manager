"use server";

import prisma from "@repo/db/client";
import { getAuthenticatedSession, getUserIdFromSession } from "../../../utils/auth";
import type { CalculatorInputs } from "../types";
import { normalizeAnnuityInputs } from "../types";

export interface AnnuityCalculatorPresetDTO {
  id: number;
  title: string;
  description: string | null;
  notes: string | null;
  inputs: CalculatorInputs;
  /** Month numbers (1-based) marked complete for this scenario. */
  completedMonths: number[];
  createdAt: Date;
  updatedAt: Date;
}

function normalizeCompletedMonthsJson(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const out: number[] = [];
  for (const item of value) {
    const n = typeof item === "number" ? item : Number(item);
    if (!Number.isFinite(n) || n < 1) continue;
    out.push(Math.floor(n));
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

function normalizeCompletedMonthsArray(completedMonths: number[]): number[] {
  const out: number[] = [];
  for (const item of completedMonths) {
    const n = Math.floor(Number(item));
    if (!Number.isFinite(n) || n < 1) continue;
    out.push(n);
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

function mapRow(row: {
  id: number;
  title: string;
  description: string | null;
  notes: string | null;
  inputsJson: unknown;
  completedMonthsJson: unknown;
  createdAt: Date;
  updatedAt: Date;
}): AnnuityCalculatorPresetDTO {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    notes: row.notes,
    inputs: normalizeAnnuityInputs(row.inputsJson),
    completedMonths: normalizeCompletedMonthsJson(row.completedMonthsJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listAnnuityCalculatorPresets(): Promise<AnnuityCalculatorPresetDTO[]> {
  const session = await getAuthenticatedSession();
  const userId = getUserIdFromSession(session.user.id);

  const rows = await prisma.annuityCalculatorPreset.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return rows.map(mapRow);
}

export async function createAnnuityCalculatorPreset(data: {
  title: string;
  description?: string;
  notes?: string;
  inputs: CalculatorInputs;
}): Promise<AnnuityCalculatorPresetDTO> {
  const session = await getAuthenticatedSession();
  const userId = getUserIdFromSession(session.user.id);

  const title = data.title.trim();
  if (!title) {
    throw new Error("Title is required");
  }

  const created = await prisma.annuityCalculatorPreset.create({
    data: {
      userId,
      title,
      description: data.description?.trim() || null,
      notes: data.notes?.trim() || null,
      inputsJson: data.inputs as object,
    },
  });

  return mapRow(created);
}

export async function updateAnnuityCalculatorPreset(
  id: number,
  data: {
    title?: string;
    description?: string | null;
    notes?: string | null;
    inputs?: CalculatorInputs;
  }
): Promise<AnnuityCalculatorPresetDTO> {
  const session = await getAuthenticatedSession();
  const userId = getUserIdFromSession(session.user.id);

  const existing = await prisma.annuityCalculatorPreset.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    throw new Error("Preset not found");
  }

  const updatePayload: {
    title?: string;
    description?: string | null;
    notes?: string | null;
    inputsJson?: object;
    completedMonthsJson?: number[];
  } = {};

  if (data.title !== undefined) {
    const title = data.title.trim();
    if (!title) throw new Error("Title cannot be empty");
    updatePayload.title = title;
  }
  if (data.description !== undefined) {
    updatePayload.description = data.description?.trim() || null;
  }
  if (data.notes !== undefined) {
    updatePayload.notes = data.notes?.trim() || null;
  }
  if (data.inputs !== undefined) {
    updatePayload.inputsJson = data.inputs as object;
    const newInputs = normalizeAnnuityInputs(data.inputs);
    const maxMonth = newInputs.years * 12;
    const current = normalizeCompletedMonthsJson(existing.completedMonthsJson);
    const trimmed = current.filter((m) => m <= maxMonth);
    if (trimmed.length !== current.length) {
      updatePayload.completedMonthsJson = trimmed;
    }
  }

  const updated = await prisma.annuityCalculatorPreset.update({
    where: { id },
    data: updatePayload,
  });

  return mapRow(updated);
}

export async function deleteAnnuityCalculatorPreset(id: number): Promise<void> {
  const session = await getAuthenticatedSession();
  const userId = getUserIdFromSession(session.user.id);

  await prisma.annuityCalculatorPreset.deleteMany({
    where: { id, userId },
  });
}

export async function updateAnnuityCalculatorPresetProgress(
  id: number,
  completedMonths: number[]
): Promise<AnnuityCalculatorPresetDTO> {
  const session = await getAuthenticatedSession();
  const userId = getUserIdFromSession(session.user.id);

  const existing = await prisma.annuityCalculatorPreset.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    throw new Error("Preset not found");
  }

  const inputs = normalizeAnnuityInputs(existing.inputsJson);
  const maxMonth = inputs.years * 12;
  const normalized = normalizeCompletedMonthsArray(completedMonths).filter((m) => m <= maxMonth);

  const updated = await prisma.annuityCalculatorPreset.update({
    where: { id },
    data: { completedMonthsJson: normalized },
  });

  return mapRow(updated);
}
