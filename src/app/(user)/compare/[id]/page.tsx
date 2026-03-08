// ============================================================
// COSFIT - S5: 비교 분석 결과 리포트 페이지
// app/(user)/compare/[id]/page.tsx
// ============================================================
// FitScoreResult를 시각화하는 서버 컴포넌트.
// DB에서 CompareResult를 조회하여 리포트를 렌더링한다.
// ============================================================

import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchCompareResult } from "../actions";
import { CompareReportClient } from "./CompareReportClient";

interface PageProps {
  params: { id: string };
}

export default async function CompareReportPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const compareId = params.id;
  const result = await fetchCompareResult(compareId);
  if (!result.success || !result.data) notFound();

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-3 border-t-[#10B981] border-[#E5E7EB] rounded-full" />
        </div>
      }
    >
      <CompareReportClient data={result.data} />
    </Suspense>
  );
}
