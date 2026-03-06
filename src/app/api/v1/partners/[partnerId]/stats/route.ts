// ============================================================
// COSFIT - Partner Statistics API
// GET /api/v1/partners/:partnerId/stats?period=DAILY|WEEKLY|MONTHLY
// ============================================================

import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { successResponse, errorResponse, ERROR_CODES } from "@/lib/api/response";

type FitGrade = "PERFECT" | "GOOD" | "FAIR" | "POOR" | "RISK";

function scoreToGrade(score: number): FitGrade {
  if (score >= 85) return "PERFECT";
  if (score >= 70) return "GOOD";
  if (score >= 50) return "FAIR";
  if (score >= 30) return "POOR";
  return "RISK";
}

export async function GET(
  request: NextRequest,
  { params }: { params: { partnerId: string } }
) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) return errorResponse(ERROR_CODES.UNAUTHORIZED, "인증이 필요합니다.", 401);

    const userRole = token.role as string;
    const partnerId = params.partnerId;

    // PARTNER는 자신의 통계만, ADMIN은 전체 조회 가능
    if (userRole !== "ADMIN" && userRole !== "PARTNER") {
      return errorResponse(ERROR_CODES.FORBIDDEN, "파트너 권한이 필요합니다.", 403);
    }

    const { searchParams } = request.nextUrl;
    const period = searchParams.get("period") ?? "MONTHLY";
    const sinceDate = new Date();
    if (period === "DAILY") sinceDate.setDate(sinceDate.getDate() - 1);
    else if (period === "WEEKLY") sinceDate.setDate(sinceDate.getDate() - 7);
    else sinceDate.setDate(sinceDate.getDate() - 30);

    // 파트너 제품 조회
    const partnerProducts = await prisma.partnerProduct.findMany({
      where: { partnerId },
      select: { productId: true, product: { select: { id: true, name: true } } },
    });

    if (partnerProducts.length === 0) {
      return successResponse({
        partnerId,
        period,
        totalCompares: 0,
        uniqueUsers: 0,
        overallAvgFitScore: 0,
        products: [],
        gradeDistribution: { PERFECT: 0, GOOD: 0, FAIR: 0, POOR: 0, RISK: 0 },
      });
    }

    const productIds = (partnerProducts as any[]).map((p) => p.productId);

    // 해당 기간의 CompareResult 집계
    const compareResults = await prisma.compareResult.findMany({
      where: {
        productId: { in: productIds },
        createdAt: { gte: sinceDate },
      },
      select: {
        productId: true,
        userId: true,
        fitScore: true,
        fitGrade: true,
        matchedGood: true,
        matchedRisk: true,
      },
    });

    const results = compareResults as any[];

    // 전체 통계
    const totalCompares = results.length;
    const uniqueUsers = new Set(results.map((r) => r.userId)).size;
    const overallAvgFitScore =
      totalCompares > 0
        ? Math.round(results.reduce((s, r) => s + r.fitScore, 0) / totalCompares)
        : 0;

    // 전체 등급 분포
    const gradeDistribution: Record<FitGrade, number> = {
      PERFECT: 0, GOOD: 0, FAIR: 0, POOR: 0, RISK: 0,
    };
    for (const r of results) {
      const g = (r.fitGrade ?? scoreToGrade(r.fitScore)) as FitGrade;
      if (gradeDistribution[g] !== undefined) gradeDistribution[g]++;
    }

    // 제품별 통계
    const byProduct = new Map<string, any[]>();
    for (const r of results) {
      if (!byProduct.has(r.productId)) byProduct.set(r.productId, []);
      byProduct.get(r.productId)!.push(r);
    }

    const products = (partnerProducts as any[]).map((pp) => {
      const pResults = byProduct.get(pp.productId) ?? [];
      const pTotal = pResults.length;
      const pAvg =
        pTotal > 0
          ? Math.round(pResults.reduce((s: number, r: any) => s + r.fitScore, 0) / pTotal)
          : 0;

      // 상위 매칭 성분 집계
      const matchCounts = new Map<string, number>();
      for (const r of pResults) {
        const goods = Array.isArray(r.matchedGood) ? r.matchedGood : [];
        for (const g of goods) {
          const name = g.nameInci ?? g.ingredient ?? "";
          if (name) matchCounts.set(name, (matchCounts.get(name) ?? 0) + 1);
        }
      }

      const topMatchedIngredients = [...matchCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([nameInci, count]) => ({ nameInci, count }));

      return {
        productId: pp.productId,
        productName: pp.product.name,
        totalCompares: pTotal,
        averageFitScore: pAvg,
        uniqueUsers: new Set(pResults.map((r: any) => r.userId)).size,
        topMatchedIngredients,
      };
    });

    // 스냅샷 저장 (upsert)
    await prisma.partnerStatSnapshot.upsert({
      where: { partnerId_periodType_periodDate: { partnerId, periodType: period, periodDate: sinceDate } },
      update: {
        totalCompares,
        averageFitScore: overallAvgFitScore,
        fitScoreDistribution: gradeDistribution,
        uniqueUsers,
      },
      create: {
        partnerId,
        periodType: period,
        periodDate: sinceDate,
        totalCompares,
        averageFitScore: overallAvgFitScore,
        fitScoreDistribution: gradeDistribution,
        uniqueUsers,
      },
    });

    return successResponse({
      partnerId,
      period,
      totalCompares,
      uniqueUsers,
      overallAvgFitScore,
      gradeDistribution,
      products: products.sort((a, b) => b.totalCompares - a.totalCompares),
    });
  } catch (error) {
    console.error("[Partner Stats API Error]", error);
    return errorResponse(ERROR_CODES.INTERNAL_ERROR, "통계 조회 중 오류가 발생했습니다.", 500);
  }
}
