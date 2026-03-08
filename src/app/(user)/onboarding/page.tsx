// ============================================================
// COSFIT - Onboarding Page (Next.js App Router)
// app/(user)/onboarding/page.tsx
// ============================================================

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OnboardingWizard } from "./OnboardingWizard";

export const metadata = {
  title: "COSFIT - 온보딩",
  description: "나만의 뷰티 기준을 만들어보세요",
};

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }
  return <OnboardingWizard />;
}
