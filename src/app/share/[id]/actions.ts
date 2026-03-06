// ============================================================
// COSFIT - Server Actions: 공유 리포트 (Public)
// app/share/[id]/actions.ts
// ============================================================
// 비로그인 사용자가 공유 링크로 접근 시,
// 축소된 리포트 데이터만 반환한다.
// (주의 요소, 성분 비교표 등 상세 정보는 제외)
// ============================================================

"use server";

// import prisma from "@/lib/prisma";

interface GuestReportData {
  id: string;
  productName: string;
  productBrand: string;
  productCategory: string;
  fitScore: number;
  fitGrade: string;
  matchedGoodCount: number;
  matchedRiskCount: number;
  topMatchedIngredients: { nameKo: string; nameInci: string }[];
  summary: string;
}

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ────────────────────────────────────────────────────────────
// 공유된 리포트 공개 조회 (축소 데이터)
// - 로그인 불필요
// - 민감한 상세 정보(주의 성분 상세, 성분 비교표 등)는 제외
// - 매칭된 선호 성분 상위 3개만 노출
// ────────────────────────────────────────────────────────────

export async function fetchCompareResultPublic(
  compareId: string
): Promise<ActionResult<GuestReportData>> {
  try {
    /*
    const result = await prisma.compareResult.findUnique({
      where: { id: compareId },
      include: {
        product: {
          include: { brand: true },
        },
      },
    });

    if (!result) {
      return { success: false, error: "분석 결과를 찾을 수 없습니다." };
    }

    const matchedGood = Array.isArray(result.matchedGood)
      ? (result.matchedGood as any[])
      : [];
    const matchedRisk = Array.isArray(result.matchedRisk)
      ? (result.matchedRisk as any[])
      : [];

    // 상위 3개 매칭 성분만 공개
    const topIngredients = matchedGood
      .sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0))
      .slice(0, 3)
      .map((g) => ({
        nameKo: g.nameKo ?? g.nameInci,
        nameInci: g.nameInci,
      }));

    return {
      success: true,
      data: {
        id: result.id,
        productName: result.product.name,
        productBrand: result.product.brand.name,
        productCategory: result.product.category,
        fitScore: result.fitScore,
        fitGrade: result.fitGrade,
        matchedGoodCount: matchedGood.length,
        matchedRiskCount: matchedRisk.length,
        topMatchedIngredients: topIngredients,
        summary: result.summary,
      },
    };
    */

    console.log("[fetchCompareResultPublic]", { compareId });
    return { success: false, error: "DB 미연결 — Mock 데이터를 사용합니다." };
  } catch (error) {
    console.error("[fetchCompareResultPublic Error]", error);
    return { success: false, error: "리포트 조회 중 오류가 발생했습니다." };
  }
}
