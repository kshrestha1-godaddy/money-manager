import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import CronJobsPageClient from "./CronJobsPageClient";
import { LOADING_COLORS } from "../../config/colorConfig";

export default async function CronJobsPage() {
  const session = await getServerSession(authOptions);
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const sessionEmail = session?.user?.email?.trim().toLowerCase();

  if (!adminEmail || !sessionEmail || sessionEmail !== adminEmail) {
    redirect("/dashboard");
  }

  return (
    <Suspense
      fallback={
        <div className={LOADING_COLORS.container}>
          <div className={LOADING_COLORS.spinner} />
          <p className={LOADING_COLORS.text}>Loading…</p>
        </div>
      }
    >
      <CronJobsPageClient />
    </Suspense>
  );
}
