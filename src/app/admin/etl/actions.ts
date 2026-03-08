// ============================================================
// COSFIT - Admin ETL Server Actions
// ============================================================

"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  runFullETL,
  runIngredientETL,
  runReviewETL,
  runProductQualityETL,
  type ETLStepResult,
  type FullETLReport,
} from "@/lib/etl/pipeline";

// ── Auth Guard ──

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("관리자 권한이 필요합니다.");
  }
  return session.user;
}

// ── Types ──

export interface ETLStatusItem {
  id: string;
  entityType: string;
  totalCount: number;
  missingRate: number;
  details: Record<string, unknown> | null;
  checkedAt: string;
}

export interface ETLStats {
  lastRunTime: string | null;
  totalLogs: number;
  pending: {
    ingredientsMissingSafety: number;
    ingredientsMissingDescription: number;
    reviewsUnanalyzed: number;
    productsIncomplete: number;
  };
}

// ── Actions ──

/**
 * 최근 ETL 실행 이력 조회
 */
export async function getETLStatus(): Promise<ETLStatusItem[]> {
  await requireAdmin();

  const logs = await prisma.dataQualityLog.findMany({
    orderBy: { checkedAt: "desc" },
    take: 30,
  });

  return logs.map((log) => ({
    id: log.id,
    entityType: log.entityType,
    totalCount: log.totalCount,
    missingRate: log.missingRate,
    details: log.details as Record<string, unknown> | null,
    checkedAt: log.checkedAt.toISOString(),
  }));
}

/**
 * ETL 파이프라인 실행
 */
export async function triggerETL(
  type: string
): Promise<ETLStepResult | FullETLReport> {
  await requireAdmin();

  switch (type) {
    case "ingredients":
      return await runIngredientETL();
    case "reviews":
      return await runReviewETL();
    case "products":
      return await runProductQualityETL();
    case "full":
    default:
      return await runFullETL();
  }
}

/**
 * ETL 요약 통계
 */
export async function getETLStats(): Promise<ETLStats> {
  await requireAdmin();

  // 최근 실행 시간
  const lastLog = await prisma.dataQualityLog.findFirst({
    orderBy: { checkedAt: "desc" },
    select: { checkedAt: true },
  });

  const totalLogs = await prisma.dataQualityLog.count();

  // 성분: 안전등급 UNKNOWN 수
  const ingredientsMissingSafety = await prisma.ingredient.count({
    where: { safetyGrade: "UNKNOWN" },
  });

  // 성분: description 누락
  const ingredientsMissingDescription = await prisma.ingredient.count({
    where: { description: null },
  });

  // 리뷰: 감성 분석 미완료
  const reviewsUnanalyzed = await prisma.collectedReview.count({
    where: { sentiment: null },
  });

  // 제품: 성분 없음 또는 데이터 이슈
  const productsIncomplete = await prisma.productMaster.count({
    where: {
      OR: [
        { ingredientCount: 0 },
        { dataStatus: { in: ["NONE", "FAILED", "QUALITY_ISSUE"] } },
      ],
    },
  });

  return {
    lastRunTime: lastLog?.checkedAt.toISOString() ?? null,
    totalLogs,
    pending: {
      ingredientsMissingSafety,
      ingredientsMissingDescription,
      reviewsUnanalyzed,
      productsIncomplete,
    },
  };
}
