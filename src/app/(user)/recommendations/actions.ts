// ============================================================
// COSFIT - Server Actions: Product Recommendations
// src/app/(user)/recommendations/actions.ts
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ProductCategory } from "@prisma/client";
import prisma from "@/lib/prisma";
import { calculateFitScore } from "@/lib/analysis";
import type { FitScoreRequest } from "@/lib/analysis/types";

// ── Auth Helper ──
async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

// ────────────────────────────────────────────────────────────
// Shared Types
// ────────────────────────────────────────────────────────────

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RecommendationItem {
  id: string;
  productId: string;
  productName: string;
  productBrand: string;
  productCategory: string;
  productImage: string | null;
  fitScore: number;
  reason: string;
  priority: number;
  isViewed: boolean;
  isPurchased: boolean;
  createdAt: string;
}

// ────────────────────────────────────────────────────────────
// Action 1: Get recommendations
// ────────────────────────────────────────────────────────────

export async function getRecommendations(
  filter: "all" | "viewed" | "not_viewed" = "all"
): Promise<ActionResult<RecommendationItem[]>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };

  try {
    const where: any = { userId };
    if (filter === "viewed") where.isViewed = true;
    if (filter === "not_viewed") where.isViewed = false;

    const recommendations = await prisma.productRecommendation.findMany({
      where,
      include: {
        product: {
          include: { brand: true },
        },
      },
      orderBy: { priority: "asc" },
    });

    const items: RecommendationItem[] = recommendations.map((rec) => ({
      id: rec.id,
      productId: rec.productId,
      productName: rec.product.name,
      productBrand: rec.product.brand.name,
      productCategory: rec.product.category,
      productImage: rec.product.imageUrl,
      fitScore: rec.fitScore,
      reason: rec.reason,
      priority: rec.priority,
      isViewed: rec.isViewed,
      isPurchased: rec.isPurchased,
      createdAt: rec.createdAt.toISOString(),
    }));

    return { success: true, data: items };
  } catch (error) {
    console.error("[getRecommendations Error]", error);
    return { success: false, error: "추천 목록 조회 중 오류가 발생했습니다." };
  }
}

// ────────────────────────────────────────────────────────────
// Action 2: Generate recommendations
// ────────────────────────────────────────────────────────────

export async function generateRecommendations(): Promise<
  ActionResult<{ count: number }>
> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };

  try {
    // Get user's standard, skin profile, and current products
    const [userStandard, skinProfile, userProducts] = await Promise.all([
      prisma.userStandard.findUnique({ where: { userId } }),
      prisma.skinProfile.findUnique({ where: { userId } }),
      prisma.userProduct.findMany({
        where: { userId },
        select: { productId: true },
      }),
    ]);

    if (!userStandard) {
      return {
        success: false,
        error: "개인 기준이 아직 생성되지 않았습니다. 온보딩을 완료해주세요.",
      };
    }

    // Get existing product IDs to exclude
    const existingProductIds = new Set(
      userProducts.map((up) => up.productId)
    );

    // Find current routine categories to detect gaps
    const currentRoutineProducts = await prisma.userProduct.findMany({
      where: { userId, isCurrentUse: true },
      include: { product: true },
    });
    const currentCategories = new Set(
      currentRoutineProducts.map((up) => up.product.category)
    );

    // Determine missing categories
    const essentialCategories: ProductCategory[] = [
      ProductCategory.CLEANSER,
      ProductCategory.TONER,
      ProductCategory.SERUM,
      ProductCategory.CREAM,
      ProductCategory.SUNSCREEN,
    ];
    const missingCategories = essentialCategories.filter(
      (c) => !currentCategories.has(c)
    );

    // Fetch candidate products (active, with ingredients)
    const candidates = await prisma.productMaster.findMany({
      where: {
        status: "ACTIVE",
        id: { notIn: Array.from(existingProductIds) },
        ingredientCount: { gt: 0 },
        ...(missingCategories.length > 0
          ? { category: { in: missingCategories } }
          : {}),
      },
      include: {
        brand: true,
        ingredients: {
          include: { ingredient: true },
          orderBy: { orderIndex: "asc" },
        },
      },
      take: 50, // Limit candidates for performance
    });

    // If not enough candidates from missing categories, also get general ones
    let allCandidates = candidates;
    if (candidates.length < 10) {
      const additionalCandidates = await prisma.productMaster.findMany({
        where: {
          status: "ACTIVE",
          id: {
            notIn: [
              ...Array.from(existingProductIds),
              ...candidates.map((c) => c.id),
            ],
          },
          ingredientCount: { gt: 0 },
        },
        include: {
          brand: true,
          ingredients: {
            include: { ingredient: true },
            orderBy: { orderIndex: "asc" },
          },
        },
        take: 30,
      });
      allCandidates = [...candidates, ...additionalCandidates];
    }

    if (allCandidates.length === 0) {
      return {
        success: false,
        error: "추천할 수 있는 제품이 없습니다.",
      };
    }

    // Score each candidate with FIT Score engine
    const scored: {
      productId: string;
      fitScore: number;
      reason: string;
      isMissingCategory: boolean;
    }[] = [];

    for (const product of allCandidates) {
      if (product.ingredients.length === 0) continue;

      const request: FitScoreRequest = {
        userStandard: {
          preferredIngredients: userStandard.preferredIngredients as any,
          avoidIngredients: userStandard.avoidIngredients as any,
          detectedPatterns: userStandard.ingredientPatterns as any,
          excludedIngredients:
            (userStandard as any).excludedIngredients ?? [],
          overallConfidence: userStandard.confidenceScore,
          basedOnProductCount: userStandard.basedOnProductCount,
          explain: {
            headline: "",
            skinSummary: "",
            preferredSummary: "",
            avoidSummary: "",
            patternSummary: "",
            tips: [],
          },
        },
        targetProduct: {
          productId: product.id,
          name: product.name,
          category: product.category,
          ingredients: product.ingredients.map((pi: any) => ({
            ingredientId: pi.ingredient.id,
            nameInci: pi.ingredient.nameInci,
            nameKo: pi.ingredient.nameKo ?? undefined,
            orderIndex: pi.orderIndex,
            safetyGrade: pi.ingredient.safetyGrade,
            ewgScore: pi.ingredient.ewgScore ?? undefined,
            commonAllergen: pi.ingredient.commonAllergen,
            category: pi.ingredient.category ?? undefined,
            functions: pi.ingredient.function ?? [],
          })),
        },
        userAllergies: skinProfile?.allergies ?? [],
        skinType: (skinProfile?.skinType as any) ?? undefined,
        sensitivityLevel: skinProfile?.sensitivityLevel ?? 3,
      };

      try {
        const fitResult = calculateFitScore(request);
        const isMissing = missingCategories.includes(product.category);

        let reason = "";
        if (isMissing) {
          const categoryLabels: Record<string, string> = {
            CLEANSER: "클렌저",
            TONER: "토너",
            SERUM: "세럼",
            CREAM: "크림",
            SUNSCREEN: "선크림",
          };
          reason = `루틴에 빠진 ${categoryLabels[product.category] ?? product.category} 카테고리 추천`;
        } else if (fitResult.score >= 80) {
          reason = `FIT Score ${fitResult.score}점 - 피부 타입에 잘 맞는 제품`;
        } else if (fitResult.score >= 60) {
          reason = `FIT Score ${fitResult.score}점 - 선호 성분 ${fitResult.reasons.length}개 포함`;
        } else {
          continue; // Skip low-scoring products
        }

        scored.push({
          productId: product.id,
          fitScore: fitResult.score,
          reason,
          isMissingCategory: isMissing,
        });
      } catch {
        // Skip products that fail analysis
        continue;
      }
    }

    // Sort: missing categories first (by score), then by score
    scored.sort((a, b) => {
      if (a.isMissingCategory !== b.isMissingCategory) {
        return a.isMissingCategory ? -1 : 1;
      }
      return b.fitScore - a.fitScore;
    });

    // Take top 10
    const topRecommendations = scored.slice(0, 10);

    if (topRecommendations.length === 0) {
      return {
        success: false,
        error: "추천 기준에 맞는 제품이 없습니다.",
      };
    }

    // Delete old recommendations and create new ones
    await prisma.productRecommendation.deleteMany({
      where: { userId },
    });

    await prisma.productRecommendation.createMany({
      data: topRecommendations.map((rec, index) => ({
        userId,
        productId: rec.productId,
        fitScore: rec.fitScore,
        reason: rec.reason,
        priority: index + 1,
        isViewed: false,
        isPurchased: false,
      })),
    });

    revalidatePath("/(user)/recommendations");

    return { success: true, data: { count: topRecommendations.length } };
  } catch (error) {
    console.error("[generateRecommendations Error]", error);
    return { success: false, error: "추천 생성 중 오류가 발생했습니다." };
  }
}

// ────────────────────────────────────────────────────────────
// Action 3: Mark recommendation as viewed
// ────────────────────────────────────────────────────────────

export async function markAsViewed(
  recommendationId: string
): Promise<ActionResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };

  try {
    // Verify ownership
    const rec = await prisma.productRecommendation.findFirst({
      where: { id: recommendationId, userId },
    });

    if (!rec) {
      return { success: false, error: "추천 항목을 찾을 수 없습니다." };
    }

    await prisma.productRecommendation.update({
      where: { id: recommendationId },
      data: { isViewed: true },
    });

    revalidatePath("/(user)/recommendations");
    return { success: true };
  } catch (error) {
    console.error("[markAsViewed Error]", error);
    return { success: false, error: "업데이트 중 오류가 발생했습니다." };
  }
}
