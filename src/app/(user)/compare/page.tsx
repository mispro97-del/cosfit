// ============================================================
// COSFIT - Compare Page (Server Component)
// app/(user)/compare/page.tsx
// ============================================================

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchCompareHistory } from "./actions";
import { ComparePageClient } from "./ComparePageClient";

export default async function ComparePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const historyResult = await fetchCompareHistory(1, 10);
  const history = historyResult.success && historyResult.data ? historyResult.data.items : [];

  return <ComparePageClient history={history} />;
}
