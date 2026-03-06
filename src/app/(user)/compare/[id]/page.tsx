// ============================================================
// COSFIT - S5: 비교 분석 결과 리포트 페이지
// app/(user)/compare/[id]/page.tsx
// ============================================================
// FitScoreResult를 시각화하는 서버 컴포넌트.
// DB에서 CompareResult를 조회하여 리포트를 렌더링한다.
// ============================================================

import { Suspense } from "react";
import { notFound } from "next/navigation";
// import { fetchCompareResult } from "../actions";
import { CompareReportClient } from "./CompareReportClient";

interface PageProps {
  params: { id: string };
}

export default async function CompareReportPage({ params }: PageProps) {
  const compareId = params.id;

  // DB 연결 시:
  // const result = await fetchCompareResult("current-user-id", compareId);
  // if (!result.success || !result.data) notFound();
  // return <CompareReportClient data={result.data} />;

  // Mock 모드:
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-3 border-t-[#C4816A] border-[#EDE6DF] rounded-full" />
        </div>
      }
    >
      <CompareReportClient compareId={compareId} />
    </Suspense>
  );
}
