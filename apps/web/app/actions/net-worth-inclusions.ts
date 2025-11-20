"use server";

import { prisma } from "@repo/db";
import { auth } from "../lib/auth";
import { WorthEntityType } from "@prisma/client";

/**
 * Get all net worth inclusions for the current user
 */
export async function getNetWorthInclusions() {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = parseInt(session.user.id);

  try {
    const inclusions = await prisma.netWorthInclusion.findMany({
      where: {
        userId,
      },
      orderBy: [
        { entityType: "asc" },
        { entityId: "asc" },
      ],
    });

    return { success: true, data: inclusions };
  } catch (error) {
    console.error("Error fetching net worth inclusions:", error);
    return { success: false, error: "Failed to fetch net worth inclusions" };
  }
}

/**
 * Toggle inclusion/exclusion of an entity in net worth
 */
export async function toggleNetWorthInclusion(
  entityType: WorthEntityType,
  entityId: number,
  includeInNetWorth: boolean
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = parseInt(session.user.id);

  try {
    // Use upsert to either create or update the record
    const inclusion = await prisma.netWorthInclusion.upsert({
      where: {
        userId_entityType_entityId: {
          userId,
          entityType,
          entityId,
        },
      },
      update: {
        includeInNetWorth,
        updatedAt: new Date(),
      },
      create: {
        userId,
        entityType,
        entityId,
        includeInNetWorth,
      },
    });

    return { success: true, data: inclusion };
  } catch (error) {
    console.error("Error toggling net worth inclusion:", error);
    return { success: false, error: "Failed to update net worth inclusion" };
  }
}

/**
 * Bulk update multiple inclusions at once
 */
export async function bulkUpdateNetWorthInclusions(
  updates: Array<{
    entityType: WorthEntityType;
    entityId: number;
    includeInNetWorth: boolean;
  }>
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = parseInt(session.user.id);

  try {
    // Use transaction to ensure all updates succeed or fail together
    const results = await prisma.$transaction(
      updates.map((update) =>
        prisma.netWorthInclusion.upsert({
          where: {
            userId_entityType_entityId: {
              userId,
              entityType: update.entityType,
              entityId: update.entityId,
            },
          },
          update: {
            includeInNetWorth: update.includeInNetWorth,
            updatedAt: new Date(),
          },
          create: {
            userId,
            entityType: update.entityType,
            entityId: update.entityId,
            includeInNetWorth: update.includeInNetWorth,
          },
        })
      )
    );

    return { success: true, data: results };
  } catch (error) {
    console.error("Error bulk updating net worth inclusions:", error);
    return { success: false, error: "Failed to bulk update net worth inclusions" };
  }
}

/**
 * Get inclusion status for a specific entity
 */
export async function getEntityInclusionStatus(
  entityType: WorthEntityType,
  entityId: number
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = parseInt(session.user.id);

  try {
    const inclusion = await prisma.netWorthInclusion.findUnique({
      where: {
        userId_entityType_entityId: {
          userId,
          entityType,
          entityId,
        },
      },
    });

    // If no record exists, default to included (true)
    return { 
      success: true, 
      data: {
        includeInNetWorth: inclusion?.includeInNetWorth ?? true,
        exists: !!inclusion,
      }
    };
  } catch (error) {
    console.error("Error fetching entity inclusion status:", error);
    return { success: false, error: "Failed to fetch inclusion status" };
  }
}

/**
 * Reset all inclusions for the user (set all to included)
 */
export async function resetAllNetWorthInclusions() {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = parseInt(session.user.id);

  try {
    // Delete all exclusions (records where includeInNetWorth is false)
    const result = await prisma.netWorthInclusion.deleteMany({
      where: {
        userId,
        includeInNetWorth: false,
      },
    });

    return { 
      success: true, 
      data: { deletedCount: result.count }
    };
  } catch (error) {
    console.error("Error resetting net worth inclusions:", error);
    return { success: false, error: "Failed to reset net worth inclusions" };
  }
}

