import { Prisma } from "@prisma/client";
import prisma from "@repo/db/client";
import { readJsonObject } from "../../lib/api-json";
import { requireAdminSession } from "../../lib/require-admin";
import { sendAccessApprovalEmail } from "../../services/email";
import { validateEmail } from "../../utils/auth";

function readEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return validateEmail(email) ? email : null;
}

function handleError(error: unknown) {
  if (error instanceof Error && error.message === "Unauthorized") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.error("Whitelist API failed:", error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET() {
  try {
    await requireAdminSession();
    const data = await prisma.whitelistedEmail.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ success: true, data });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession();
    const body = await readJsonObject(request);
    const email = readEmail(body?.email);
    const reason = body?.reason;
    if (!email || (reason != null && typeof reason !== "string")) {
      return Response.json({ error: "A valid email and optional text reason are required" }, { status: 400 });
    }

    const data = { isActive: true, addedBy: admin.email, reason };
    await prisma.$transaction(async (transaction) => {
      const { count } = await transaction.whitelistedEmail.updateMany({
        where: { email, isActive: false },
        data,
      });
      if (count === 0) {
        await transaction.whitelistedEmail.create({ data: { email, ...data } });
      }
    });

    try {
      await sendAccessApprovalEmail(email);
    } catch (error) {
      console.error("Failed to send whitelist approval email:", error);
    }

    return Response.json({ success: true, message: `Email ${email} has been added to whitelist` });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "Email is already whitelisted" }, { status: 409 });
    }
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdminSession();
    const body = await readJsonObject(request);
    const email = readEmail(body?.email);
    if (!email) {
      return Response.json({ error: "A valid email is required" }, { status: 400 });
    }

    await prisma.whitelistedEmail.update({
      where: { email },
      data: { isActive: false },
    });
    return Response.json({ success: true, message: `Email ${email} has been removed from whitelist` });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return Response.json({ error: "Email is not on the whitelist" }, { status: 404 });
    }
    return handleError(error);
  }
}
