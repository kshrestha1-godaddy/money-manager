"use server";

import type { BloodPressureCategory } from "@prisma/client";
import prisma from "@repo/db/client";
import { getVerifiedUserIdForDataAccess } from "../../../utils/auth";
import { classifyBloodPressure, parseMeasuredAtInput } from "../blood-pressure-helpers";

export interface BloodPressureReadingDTO {
  id: number;
  measuredAt: string;
  systolic: number;
  diastolic: number;
  category: BloodPressureCategory;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: {
  id: number;
  measuredAt: Date;
  systolic: number;
  diastolic: number;
  category: BloodPressureCategory;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): BloodPressureReadingDTO {
  return {
    id: row.id,
    measuredAt: row.measuredAt.toISOString(),
    systolic: row.systolic,
    diastolic: row.diastolic,
    category: classifyBloodPressure(row.systolic, row.diastolic),
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function validateMmHg(n: number, label: string): number {
  if (!Number.isInteger(n) || n < 30 || n > 300) {
    throw new Error(`${label} must be a whole number between 30 and 300 mmHg`);
  }
  return n;
}

export async function getBloodPressureReadings(): Promise<BloodPressureReadingDTO[]> {
  const userId = await getVerifiedUserIdForDataAccess();
  const rows = await prisma.bloodPressureReading.findMany({
    where: { userId },
    orderBy: [{ measuredAt: "desc" }, { id: "desc" }],
  });
  return rows.map(mapRow);
}

export async function createBloodPressureReading(form: {
  measuredAt: string;
  systolic: number;
  diastolic: number;
  notes: string;
}): Promise<{ ok: true; reading: BloodPressureReadingDTO } | { error: string }> {
  try {
    const userId = await getVerifiedUserIdForDataAccess();
    const systolic = validateMmHg(Math.round(Number(form.systolic)), "Systolic");
    const diastolic = validateMmHg(Math.round(Number(form.diastolic)), "Diastolic");
    const measuredAt = parseMeasuredAtInput(form.measuredAt);
    const category = classifyBloodPressure(systolic, diastolic);
    const notes = form.notes.trim() || null;

    const row = await prisma.bloodPressureReading.create({
      data: {
        userId,
        measuredAt,
        systolic,
        diastolic,
        category,
        notes,
      },
    });
    return { ok: true, reading: mapRow(row) };
  } catch (e) {
    console.error(e);
    return { error: e instanceof Error ? e.message : "Failed to save reading" };
  }
}

export async function updateBloodPressureReading(
  id: number,
  form: {
    measuredAt: string;
    systolic: number;
    diastolic: number;
    notes: string;
  }
): Promise<{ ok: true; reading: BloodPressureReadingDTO } | { error: string }> {
  try {
    const userId = await getVerifiedUserIdForDataAccess();
    if (!Number.isInteger(id) || id < 1) return { error: "Invalid reading" };

    const existing = await prisma.bloodPressureReading.findFirst({
      where: { id, userId },
    });
    if (!existing) return { error: "Reading not found" };

    const systolic = validateMmHg(Math.round(Number(form.systolic)), "Systolic");
    const diastolic = validateMmHg(Math.round(Number(form.diastolic)), "Diastolic");
    const measuredAt = parseMeasuredAtInput(form.measuredAt);
    const category = classifyBloodPressure(systolic, diastolic);
    const notes = form.notes.trim() || null;

    const row = await prisma.bloodPressureReading.update({
      where: { id },
      data: { measuredAt, systolic, diastolic, category, notes },
    });
    return { ok: true, reading: mapRow(row) };
  } catch (e) {
    console.error(e);
    return { error: e instanceof Error ? e.message : "Failed to update reading" };
  }
}

export async function deleteBloodPressureReading(id: number): Promise<{ ok: true } | { error: string }> {
  try {
    const userId = await getVerifiedUserIdForDataAccess();
    if (!Number.isInteger(id) || id < 1) return { error: "Invalid reading" };

    const res = await prisma.bloodPressureReading.deleteMany({
      where: { id, userId },
    });
    if (res.count === 0) return { error: "Reading not found" };
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { error: e instanceof Error ? e.message : "Failed to delete reading" };
  }
}
