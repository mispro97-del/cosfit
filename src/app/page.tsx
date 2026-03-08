import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  const onboardingStatus = session.user.onboardingStatus;

  if (role === "ADMIN") {
    redirect("/admin/data-collection");
  }

  if (role === "PARTNER") {
    redirect("/partner/dashboard");
  }

  // USER: PENDING → 온보딩, 완료 → 히스토리
  if (!onboardingStatus || onboardingStatus === "PENDING") {
    redirect("/onboarding");
  }

  redirect("/home");
}
