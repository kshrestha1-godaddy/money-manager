"use server";

import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { getUserIdFromSession } from "../../utils/auth";

async function requireUserId() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");
  return getUserIdFromSession(session.user.id);
}

export async function getPatternAnalysisCategories() {
  const userId = await requireUserId();
  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true, color: true, patternAnalysisSelection: true },
  });

  return categories.map(({ patternAnalysisSelection, ...category }) => ({
    ...category,
    managed: patternAnalysisSelection !== null,
  }));
}

export async function savePatternAnalysisCategories(categoryIds: number[]) {
  const userId = await requireUserId();
  if (!Array.isArray(categoryIds) || !categoryIds.every((id) => Number.isSafeInteger(id) && id > 0)) {
    throw new Error("Invalid category selection");
  }
  const ids = [...new Set(categoryIds)];

  await prisma.$transaction(async (tx) => {
    // Serialize replacements for this user across tabs.
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const ownedCategories = await tx.category.findMany({
      where: { userId, id: { in: ids } },
      select: { id: true },
    });
    if (ownedCategories.length !== ids.length) throw new Error("Invalid category selection");

    await tx.patternAnalysisCategory.deleteMany({
      where: { category: { userId }, ...(ids.length ? { categoryId: { notIn: ids } } : {}) },
    });
    if (ids.length) {
      await tx.patternAnalysisCategory.createMany({
        data: ids.map((categoryId) => ({ categoryId })),
        skipDuplicates: true,
      });
    }
  });
}
