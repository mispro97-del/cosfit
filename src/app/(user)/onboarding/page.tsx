// ============================================================
// COSFIT - Onboarding Page (Next.js App Router)
// app/(user)/onboarding/page.tsx
// ============================================================

import { OnboardingWizard } from "./OnboardingWizard";

export const metadata = {
  title: "COSFIT - 온보딩",
  description: "나만의 뷰티 기준을 만들어보세요",
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
