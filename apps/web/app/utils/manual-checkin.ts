import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import { getUserIdFromSession } from "../utils/auth";
import prisma from "@repo/db/client";

/**
 * Function to manually record a checkin (can be called from components)
 */
export async function recordManualCheckin() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    const userId = getUserIdFromSession(session.user.id);
    
    await prisma.userCheckin.create({
      data: {
        userId,
        checkinAt: new Date(),
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error recording manual checkin:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
