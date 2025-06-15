import { NextRequest, NextResponse } from "next/server";
import { 
  isEmailWhitelisted, 
  addEmailToWhitelist, 
  removeEmailFromWhitelist, 
  getAllWhitelistedEmails 
} from "../../actions/whitelist";
import { sendAccessApprovalEmail } from "../../services/email";

// GET - Get all whitelisted emails
export async function GET() {
  try {
    const whitelistedEmails = await getAllWhitelistedEmails();
    return NextResponse.json({
      success: true,
      data: whitelistedEmails
    });
  } catch (error) {
    console.error("Error fetching whitelisted emails:", error);
    return NextResponse.json(
      { error: "Failed to fetch whitelisted emails" },
      { status: 500 }
    );
  }
}

// POST - Add email to whitelist
export async function POST(req: NextRequest) {
  try {
    const { email, addedBy, reason } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if email is already whitelisted
    const isAlreadyWhitelisted = await isEmailWhitelisted(email);
    if (isAlreadyWhitelisted) {
      return NextResponse.json(
        { error: "Email is already whitelisted" },
        { status: 409 }
      );
    }

    const success = await addEmailToWhitelist(email, addedBy, reason);
    
    if (success) {
      // Send approval email to the newly whitelisted user
      try {
        await sendAccessApprovalEmail(email);
        console.log(`Approval email sent to ${email}`);
      } catch (emailError) {
        console.error(`Failed to send approval email to ${email}:`, emailError);
        // Don't fail the whole request if email fails - just log it
      }

      return NextResponse.json({
        success: true,
        message: `Email ${email} has been added to whitelist`
      });
    } else {
      return NextResponse.json(
        { error: "Failed to add email to whitelist" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error adding email to whitelist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove email from whitelist
export async function DELETE(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const success = await removeEmailFromWhitelist(email);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: `Email ${email} has been removed from whitelist`
      });
    } else {
      return NextResponse.json(
        { error: "Failed to remove email from whitelist" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error removing email from whitelist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 