import prisma from "@repo/db/client";
import { validateEmail } from "../utils/auth";


export async function isEmailWhitelisted(email: string): Promise<boolean> {
  if (!email) return false;

  // Validate email format before checking database
  if (!validateEmail(email)) {
    return false;
  }

  try {
    const whitelistedEmail = await prisma.whitelistedEmail.findUnique({
      where: {
        email: email.toLowerCase().trim(),
      },
    });

    return whitelistedEmail !== null && whitelistedEmail.isActive;
  } catch (error) {
    console.error(`Failed to check whitelisted email ${email}:`, error);
    return false;
  }
}
