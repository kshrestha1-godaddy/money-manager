import { getServerSession } from "next-auth";
import prisma from "@repo/db/client";
import { authOptions } from "./auth";
import { requireEnvVar } from "../utils/auth";

export async function requireAdminSession(): Promise<{
  userId: number;
  email: string;
}> {
  const session = await getServerSession(authOptions);
  const adminEmail = requireEnvVar("ADMIN_EMAIL").trim().toLowerCase();
  const sessionEmail = session?.user?.email?.trim().toLowerCase();

  if (!sessionEmail || sessionEmail !== adminEmail) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: sessionEmail, mode: "insensitive" } },
    select: { id: true, email: true },
  });

  if (!user?.email) {
    throw new Error("Unauthorized");
  }

  return {
    userId: user.id,
    email: user.email,
  };
}

export async function isAdminSession(): Promise<boolean> {
  try {
    await requireAdminSession();
    return true;
  } catch {
    return false;
  }
}
