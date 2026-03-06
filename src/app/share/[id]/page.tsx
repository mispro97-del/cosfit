// ============================================================
// COSFIT - 공유 링크 게스트 보기 페이지
// app/share/[id]/page.tsx
// ============================================================
// 비로그인 사용자가 공유받은 링크로 접근 시,
// 리포트 요약본(점수 + 매칭 성분 + 블러 처리된 상세)을 보여주고
// 회원가입을 유도한다.
// ============================================================

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GuestReportClient } from "./GuestReportClient";
// import { fetchCompareResultPublic } from "./actions";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps) {
  // DB 연결 시 OG 메타 태그 동적 생성:
  /*
  const result = await fetchCompareResultPublic(params.id);
  if (!result.success || !result.data) return { title: "COSFIT" };

  const r = result.data;
  return {
    title: `${r.productName} - FIT Score ${r.fitScore}점 | COSFIT`,
    description: `나에게 이 제품은 ${r.fitScore}점이래요! 당신의 기준과도 비교해보세요.`,
    openGraph: {
      title: `[COSFIT] ${r.productName} - FIT Score ${r.fitScore}점`,
      description: `선호 성분 ${r.matchedGoodCount}개 매칭, 주의 성분 ${r.matchedRiskCount}개. 나의 FIT Score도 확인해보세요!`,
      images: [{ url: `/api/og/compare/${params.id}`, width: 1200, height: 630 }],
      type: "article",
      siteName: "COSFIT",
    },
    twitter: {
      card: "summary_large_image",
      title: `[COSFIT] FIT Score ${r.fitScore}점`,
      description: `${r.productName} (${r.productBrand}) — 당신의 기준과 비교해보세요.`,
    },
  };
  */

  return {
    title: "FIT Score 리포트 | COSFIT",
    description: "COSFIT에서 나에게 맞는 제품을 찾아보세요.",
  };
}

export default async function SharedReportPage({ params }: PageProps) {
  const compareId = params.id;

  // DB 연결 시:
  /*
  const result = await fetchCompareResultPublic(compareId);
  if (!result.success || !result.data) notFound();
  return <GuestReportClient data={result.data} />;
  */

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#FDFBF9]">
          <div className="animate-spin w-8 h-8 border-[3px] border-t-[#C4816A] border-[#EDE6DF] rounded-full" />
        </div>
      }
    >
      <GuestReportClient compareId={compareId} />
    </Suspense>
  );
}
