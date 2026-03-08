// ============================================================
// COSFIT - Admin Server Actions
// app/(admin)/actions.ts
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { summarizeReview } from "@/lib/ai/review-summarizer";

// ── Types ──

export interface SyncLogItem {
  id: string;
  source: string;
  syncType: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  itemsProcessed: number;
  itemsFailed: number;
  startedAt: string;
  completedAt: string | null;
  triggeredBy: string | null;
  errorSummary: string | null;
}

export interface ReviewItem {
  id: string;
  productName: string;
  productBrand: string;
  userName: string;
  rating: number;
  content: string;
  pros: string[];
  cons: string[];
  status: "PENDING" | "AI_SUMMARIZED" | "APPROVED" | "REJECTED";
  aiSummary: string | null;
  aiSentiment: string | null;
  aiKeywords: string[];
  createdAt: string;
}

export interface NormBatchResult {
  totalProcessed: number;
  resolved: number;
  unresolved: number;
  failureLogs: { rawName: string; closestMatch: string | null; similarity: number }[];
}

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Mock Data ──

const MOCK_SYNC_LOGS: SyncLogItem[] = [
  { id: "sync_01", source: "식약처 API", syncType: "PRODUCTS", status: "COMPLETED", itemsProcessed: 1247, itemsFailed: 3, startedAt: "2025-06-15T02:00:00Z", completedAt: "2025-06-15T02:15:32Z", triggeredBy: "admin@cosfit.kr", errorSummary: null },
  { id: "sync_02", source: "식약처 API", syncType: "INGREDIENTS", status: "COMPLETED", itemsProcessed: 8432, itemsFailed: 12, startedAt: "2025-06-15T02:15:33Z", completedAt: "2025-06-15T02:28:47Z", triggeredBy: "admin@cosfit.kr", errorSummary: null },
  { id: "sync_03", source: "EWG Database", syncType: "SAFETY_SCORES", status: "FAILED", itemsProcessed: 342, itemsFailed: 342, startedAt: "2025-06-14T03:00:00Z", completedAt: "2025-06-14T03:02:11Z", triggeredBy: "system", errorSummary: "Connection timeout: EWG API unreachable" },
  { id: "sync_04", source: "식약처 API", syncType: "PRODUCTS", status: "IN_PROGRESS", itemsProcessed: 567, itemsFailed: 0, startedAt: "2025-06-16T02:00:00Z", completedAt: null, triggeredBy: "system", errorSummary: null },
  { id: "sync_05", source: "Brand Direct", syncType: "PRODUCT_DETAIL", status: "PENDING", itemsProcessed: 0, itemsFailed: 0, startedAt: "2025-06-16T04:00:00Z", completedAt: null, triggeredBy: null, errorSummary: null },
];

const MOCK_REVIEWS: ReviewItem[] = [
  { id: "rev_01", productName: "아토베리어 365 크림", productBrand: "에스트라", userName: "진짜민감*", rating: 5, content: "겨울에 무조건 이거 써요. 진짜 자극 하나도 없고 속보습이 오래 가요.", pros: ["무자극", "보습력"], cons: [], status: "AI_SUMMARIZED", aiSummary: "민감 피부 사용자가 높은 보습력과 저자극을 경험함. 계절별 사용 패턴(겨울) 관찰.", aiSentiment: "POSITIVE", aiKeywords: ["무자극", "보습력", "겨울크림"], createdAt: "2025-06-14T08:30:00Z" },
  { id: "rev_02", productName: "아토베리어 365 크림", productBrand: "에스트라", userName: "뷰티러*", rating: 4, content: "향이 좀 아쉽지만 효과는 확실해요. 피부 장벽이 튼튼해진 느낌.", pros: ["장벽강화", "효과확실"], cons: ["향"], status: "AI_SUMMARIZED", aiSummary: "장벽 강화 효과를 체감하나 향에 대한 아쉬움 있음. 총평 긍정적.", aiSentiment: "POSITIVE", aiKeywords: ["장벽강화", "향", "효과"], createdAt: "2025-06-13T15:20:00Z" },
  { id: "rev_03", productName: "더마 시카 크림", productBrand: "에스트라", userName: "스킨케*", rating: 2, content: "저한테는 안 맞았어요. 바르고 나서 붉어지고 따가웠어요.", pros: [], cons: ["자극", "붉어짐"], status: "AI_SUMMARIZED", aiSummary: "해당 사용자에게 접촉성 자극 반응 발생. 부정적 경험.", aiSentiment: "NEGATIVE", aiKeywords: ["자극", "붉어짐", "부적합"], createdAt: "2025-06-12T11:45:00Z" },
  { id: "rev_04", productName: "다이브인 세럼", productBrand: "토리든", userName: "수분좋*", rating: 5, content: "진짜 수분감이 미쳤어요!! 가볍고 흡수 빠르고 최고", pros: ["수분감", "가벼움", "흡수력"], cons: [], status: "PENDING", aiSummary: null, aiSentiment: null, aiKeywords: [], createdAt: "2025-06-11T09:10:00Z" },
  { id: "rev_05", productName: "비타C 잡티 세럼", productBrand: "구달", userName: "잡티고*", rating: 3, content: "한 달 써봤는데 잡티는 좀 옅어진 것 같고 피부톤은 확실히 밝아졌어요.", pros: ["미백", "톤업"], cons: ["효과느림"], status: "APPROVED", aiSummary: "1개월 사용 후 미백 효과 체감. 즉각 효과보다는 장기 사용 필요.", aiSentiment: "NEUTRAL", aiKeywords: ["미백", "톤업", "장기사용"], createdAt: "2025-06-10T14:30:00Z" },
];

// ── Data Collection Actions ──

export async function fetchSyncLogs(): Promise<ActionResult<SyncLogItem[]>> {
  try {
    const logs = await prisma.dataSyncLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 30,
    });
    return {
      success: true,
      data: (logs as any[]).map((l) => ({
        id: l.id,
        source: l.source,
        syncType: l.syncType,
        status: l.status,
        itemsProcessed: l.itemsProcessed,
        itemsFailed: l.itemsFailed,
        startedAt: l.startedAt.toISOString(),
        completedAt: l.completedAt?.toISOString() ?? null,
        triggeredBy: l.triggeredBy,
        errorSummary: l.errorLog ? JSON.stringify(l.errorLog).slice(0, 100) : null,
      })),
    };
  } catch (error) {
    return { success: false, error: "수집 로그 조회 실패" };
  }
}

export async function triggerDataSync(source: string, syncType: string, adminEmail?: string): Promise<ActionResult<{ syncId: string }>> {
  try {
    const log = await prisma.dataSyncLog.create({
      data: { source, syncType, status: "IN_PROGRESS", triggeredBy: adminEmail ?? "admin" },
    }) as any;
    revalidatePath("/(admin)/data-collection");
    return { success: true, data: { syncId: log.id } };
  } catch (error) {
    return { success: false, error: "동기화 시작 실패" };
  }
}

// ── Review Management Actions ──

export async function fetchPendingReviews(): Promise<ActionResult<ReviewItem[]>> {
  try {
    const reviews = await prisma.review.findMany({
      where: { status: { in: ["PENDING", "AI_SUMMARIZED"] } },
      include: { product: { include: { brand: true } }, user: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return {
      success: true,
      data: (reviews as any[]).map((r) => ({
        id: r.id,
        productName: r.product.name,
        productBrand: r.product.brand.name,
        userName: r.user.name ?? "익명",
        rating: r.rating,
        content: r.content,
        pros: r.pros ?? [],
        cons: r.cons ?? [],
        status: r.status,
        aiSummary: r.aiSummary,
        aiSentiment: r.aiSentiment,
        aiKeywords: r.aiKeywords ?? [],
        createdAt: r.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    return { success: false, error: "리뷰 조회 실패" };
  }
}

export async function approveReview(reviewId: string, adminId: string): Promise<ActionResult> {
  try {
    await prisma.review.update({
      where: { id: reviewId },
      data: { status: "APPROVED" },
    });
    revalidatePath("/(admin)/review-management");
    return { success: true };
  } catch (error) {
    return { success: false, error: "승인 처리 실패" };
  }
}

export async function rejectReview(reviewId: string, reason: string): Promise<ActionResult> {
  try {
    await prisma.review.update({
      where: { id: reviewId },
      data: { status: "REJECTED" },
    });
    revalidatePath("/(admin)/review-management");
    return { success: true };
  } catch (error) {
    return { success: false, error: "반려 처리 실패" };
  }
}

export async function triggerAiSummarize(reviewId: string): Promise<ActionResult> {
  try {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { product: true },
    }) as any;
    if (!review) return { success: false, error: "리뷰를 찾을 수 없습니다." };

    const result = await summarizeReview({
      content: review.content,
      rating: review.rating,
      pros: review.pros ?? [],
      cons: review.cons ?? [],
      productName: review.product.name,
    });

    await prisma.review.update({
      where: { id: reviewId },
      data: {
        status: "AI_SUMMARIZED",
        aiSummary: result.aiSummary,
        aiSentiment: result.aiSentiment,
        aiKeywords: result.aiKeywords,
      },
    });

    revalidatePath("/(admin)/review-management");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message ?? "AI 요약 실행 실패" };
  }
}

// ── Normalization Batch Actions ──

export async function runNormalizationBatch(syncLogId?: string): Promise<ActionResult<NormBatchResult>> {
  try {
    // 1. RAW_SAVED 상태 제품 조회 (정규화 대기 중)
    const rawProducts = await prisma.productMaster.findMany({
      where: { dataStatus: "RAW_SAVED" },
      select: { id: true, name: true, rawIngredients: true },
      take: 200,
    });

    let resolved = 0;
    let unresolved = 0;
    const failureLogs: NormBatchResult["failureLogs"] = [];

    // 2. 각 제품을 NORMALIZING 상태로 전환
    for (const product of rawProducts as any[]) {
      if (!product.rawIngredients) {
        unresolved++;
        continue;
      }

      try {
        await prisma.productMaster.update({
          where: { id: product.id },
          data: { dataStatus: "NORMALIZING" },
        });
        resolved++;
      } catch (err: any) {
        unresolved++;
        failureLogs.push({
          rawName: product.name,
          closestMatch: null,
          similarity: 0,
        });
      }
    }

    // 3. 동기화 로그 완료 처리
    if (syncLogId) {
      await prisma.dataSyncLog.update({
        where: { id: syncLogId },
        data: {
          status: "COMPLETED",
          itemsProcessed: resolved,
          itemsFailed: unresolved,
          completedAt: new Date(),
        },
      });
    }

    revalidatePath("/(admin)/data-collection");
    return {
      success: true,
      data: { totalProcessed: rawProducts.length, resolved, unresolved, failureLogs },
    };
  } catch (error) {
    return { success: false, error: "정규화 배치 실행 실패" };
  }
}
