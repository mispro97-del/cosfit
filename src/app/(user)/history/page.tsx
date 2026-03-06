// ============================================================
// COSFIT - S6: 분석 히스토리 페이지
// app/(user)/history/page.tsx
// ============================================================
// compare_results 테이블에서 사용자의 분석 히스토리를 조회하고,
// 각 항목 클릭 시 /compare/[id]로 이동하여 상세 리포트를 표시.
// ============================================================

import { Suspense } from "react";
import { HistoryClient } from "./HistoryClient";
// import { fetchCompareHistory } from "../compare/actions";

export const metadata = {
  title: "분석 히스토리 | COSFIT",
  description: "이전에 분석한 제품의 FIT Score를 확인하세요.",
};

export default async function HistoryPage() {
  // DB 연결 시:
  // const result = await fetchCompareHistory("current-user-id");
  // const items = result.success ? result.data?.items ?? [] : [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">📊</span>
        <h1 className="text-lg font-bold text-[#2D2420] m-0">분석 히스토리</h1>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-[3px] border-t-[#C4816A] border-[#EDE6DF] rounded-full animate-spin" />
          </div>
        }
      >
        {/* DB 연결 시: <HistoryClient items={items} /> */}
        <HistoryClient />
      </Suspense>
    </div>
  );
}
