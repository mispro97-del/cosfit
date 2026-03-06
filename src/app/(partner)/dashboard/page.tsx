// ============================================================
// COSFIT - Partner Dashboard Page
// app/(partner)/dashboard/page.tsx
// ============================================================

import { fetchPartnerDashboard } from "../actions";
import { DashboardClient } from "./DashboardClient";

export const metadata = { title: "파트너 대시보드 | COSFIT" };

export default async function DashboardPage() {
  // const result = await fetchPartnerDashboard("partner-id-here");
  // const data = result.success ? result.data! : null;
  return <DashboardClient />;
}
