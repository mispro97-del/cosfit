// ============================================================
// COSFIT - Partner Dashboard Page
// app/(partner)/dashboard/page.tsx
// ============================================================

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchPartnerDashboard } from "../actions";
import { DashboardClient } from "./DashboardClient";

export const metadata = { title: "파트너 대시보드 | COSFIT" };

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  // fetchPartnerDashboard gets partnerId from session internally
  const result = await fetchPartnerDashboard();
  const data = result.success ? result.data! : null;

  return <DashboardClient data={data} />;
}
