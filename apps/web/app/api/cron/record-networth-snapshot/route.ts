import { NextRequest, NextResponse } from "next/server";
import { recordNetworthSnapshotForUser } from "../../../(dashboard)/worth/actions/networth-history";
import prisma from "@repo/db/client";

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (optional security check)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("Starting cron job: record-networth-snapshot");
    
    // Get all active users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    console.log(`Found ${users.length} users to process`);

    const results = {
      processedUsers: 0,
      successfulRecords: 0,
      errors: [] as Array<{ userId: number; email: string | null; error: string }>
    };

    // Process each user to record their net worth snapshot
    for (const user of users) {
      try {
        results.processedUsers++;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day for consistent snapshots

        // Record net worth snapshot for this user
        const recordResult = await recordNetworthSnapshotForUser(user.id, "AUTOMATIC", today);
        
        if (recordResult.success) {
          console.log(`Successfully recorded net worth for user ${user.id}`);
          results.successfulRecords++;
        } else {
          console.error(`Failed to record net worth for user ${user.id}:`, recordResult.error);
          results.errors.push({
            userId: user.id,
            email: user.email,
            error: recordResult.error || "Unknown error"
          });
        }

      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
        results.errors.push({
          userId: user.id,
          email: user.email,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
    
    console.log("Cron job completed:", results);
    
    return NextResponse.json({
      success: true,
      message: "Net worth snapshot recording completed",
      result: {
        processedUsers: results.processedUsers,
        successfulRecords: results.successfulRecords,
        errorCount: results.errors.length,
        errors: results.errors.slice(0, 5) // Only return first 5 errors to avoid large response
      }
    });

  } catch (error) {
    console.error("Error in record-networth-snapshot cron job:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 });
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}