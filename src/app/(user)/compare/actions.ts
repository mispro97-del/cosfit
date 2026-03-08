// ============================================================
// COSFIT - Server Actions: Compare Results & History
// app/(user)/compare/actions.ts
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

export interface CompareResultDetail {
  id: string;
  productId: string;
  productName: string;
  productBrand: string;
  productCategory: string;
  productImage: string | null;
  fitScore: number;
  fitGrade: string;
  matchedGood: {
    ingredientId: string;
    nameInci: string;
    nameKo: string | null;
    reason: string;
    impactScore: number;
    positionInProduct: number;
  }[];
  matchedRisk: {
    ingredientId: string;
    nameInci: string;
    nameKo: string | null;
    riskLevel: "HIGH" | "MEDIUM" | "LOW";
    reason: string;
    penaltyScore: number;
    source: string;
  }[];
  missingPreferred: {
    ingredientId: string;
    nameInci: string;
    nameKo: string | null;
    importance: "HIGH" | "MEDIUM" | "LOW";
    weight: number;
  }[];
  summary: string;
  breakdown: {
    baseScore: number;
    riskPenalty: number;
    bonusScore: number;
    finalScore: number;
  };
  metadata: {
    analysisModel: string;
    processingTimeMs: number;
    ingredientsCovered: number;
    totalProductIngredients: number;
    coverageRatio: number;
  };
  ingredientComparison: {
    common: IngredientRow[];
    productOnly: IngredientRow[];
    holyGrailOnly: IngredientRow[];
  };
  dataConfidence: "HIGH" | "MEDIUM" | "LOW";
  createdAt: string;
}

interface IngredientRow {
  nameInci: string;
  nameKo: string | null;
  category: string | null;
  safetyGrade: string;
  orderIndex?: number;
}

export interface HistoryItem {
  id: string;
  productName: string;
  productBrand: string;
  productCategory: string;
  productImage: string | null;
  fitScore: number;
  fitGrade: string;
  reasonsCount: number;
  risksCount: number;
  createdAt: string;
}

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ────────────────────────────────────────────────────────────
// Action 1: 분석 결과 상세 조회
// ────────────────────────────────────────────────────────────

export async function fetchCompareResult(
  compareId: string
): Promise<ActionResult<CompareResultDetail>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };

  try {
    const result = await prisma.compareResult.findUnique({
      where: { id: compareId, userId },
      include: {
        product: {
          include: {
            brand: true,
            ingredients: {
              include: { ingredient: true },
              orderBy: { orderIndex: "asc" },
            },
          },
        },
        userStandard: true,
      },
    });

    if (!result) {
      return { success: false, error: "분석 결과를 찾을 수 없습니다." };
    }

    const holyGrails = await prisma.holyGrailProduct.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            ingredients: { include: { ingredient: true } },
          },
        },
      },
    });

    const hgIngredientMap = new Map<string, IngredientRow>();
    for (const hg of holyGrails) {
      for (const pi of hg.product?.ingredients ?? []) {
        hgIngredientMap.set(pi.ingredient.nameInci, {
          nameInci: pi.ingredient.nameInci,
          nameKo: pi.ingredient.nameKo,
          category: pi.ingredient.category,
          safetyGrade: pi.ingredient.safetyGrade,
        });
      }
    }

    const productIngredientNames = new Set<string>();
    const common: IngredientRow[] = [];
    const productOnly: IngredientRow[] = [];

    for (const pi of result.product.ingredients) {
      const name = pi.ingredient.nameInci;
      productIngredientNames.add(name);
      const row: IngredientRow = {
        nameInci: name,
        nameKo: pi.ingredient.nameKo,
        category: pi.ingredient.category,
        safetyGrade: pi.ingredient.safetyGrade,
        orderIndex: pi.orderIndex,
      };
      if (hgIngredientMap.has(name)) {
        common.push(row);
      } else {
        productOnly.push(row);
      }
    }

    const holyGrailOnly: IngredientRow[] = [];
    for (const [name, row] of hgIngredientMap) {
      if (!productIngredientNames.has(name)) {
        holyGrailOnly.push(row);
      }
    }

    const matchedGood = result.matchedGood as any[];
    const totalIng = result.product.ingredients.length;
    const coverageRatio = totalIng > 0 ? matchedGood.length / totalIng : 0;
    const dataConfidence: "HIGH" | "MEDIUM" | "LOW" =
      coverageRatio >= 0.15 && matchedGood.length >= 3 ? "HIGH"
      : coverageRatio >= 0.08 ? "MEDIUM" : "LOW";

    const matchedRisk = result.matchedRisk as any[];
    const totalPenalty = matchedRisk.reduce((s: number, r: any) => s + (r.penaltyScore ?? 0), 0);

    return {
      success: true,
      data: {
        id: result.id,
        productId: result.productId,
        productName: result.product.name,
        productBrand: result.product.brand.name,
        productCategory: result.product.category,
        productImage: result.product.imageUrl,
        fitScore: result.fitScore,
        fitGrade: result.fitGrade,
        matchedGood,
        matchedRisk,
        missingPreferred: result.missingPreferred as any[],
        summary: result.summary,
        breakdown: {
          baseScore: Math.min(result.fitScore + totalPenalty, 100),
          riskPenalty: totalPenalty,
          bonusScore: 0,
          finalScore: result.fitScore,
        },
        metadata: {
          analysisModel: result.analysisModel,
          processingTimeMs: result.processingTimeMs ?? 0,
          ingredientsCovered: matchedGood.length,
          totalProductIngredients: totalIng,
          coverageRatio: Math.round(coverageRatio * 100) / 100,
        },
        ingredientComparison: { common, productOnly, holyGrailOnly },
        dataConfidence,
        createdAt: result.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[fetchCompareResult Error]", error);
    return { success: false, error: "분석 결과 조회 중 오류가 발생했습니다." };
  }
}

// ────────────────────────────────────────────────────────────
// Action 2: 분석 히스토리 목록 조회
// ────────────────────────────────────────────────────────────

export async function fetchCompareHistory(
  page = 1,
  limit = 20
): Promise<ActionResult<{ items: HistoryItem[]; total: number; hasMore: boolean }>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };

  try {
    const [results, total] = await Promise.all([
      prisma.compareResult.findMany({
        where: { userId },
        include: {
          product: { include: { brand: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.compareResult.count({ where: { userId } }),
    ]);

    const items: HistoryItem[] = results.map((r: any) => ({
      id: r.id,
      productName: r.product.name,
      productBrand: r.product.brand.name,
      productCategory: r.product.category,
      productImage: r.product.imageUrl,
      fitScore: r.fitScore,
      fitGrade: r.fitGrade,
      reasonsCount: Array.isArray(r.matchedGood) ? (r.matchedGood as any[]).length : 0,
      risksCount: Array.isArray(r.matchedRisk) ? (r.matchedRisk as any[]).length : 0,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      success: true,
      data: { items, total, hasMore: page * limit < total },
    };
  } catch (error) {
    console.error("[fetchCompareHistory Error]", error);
    return { success: false, error: "히스토리 조회 중 오류가 발생했습니다." };
  }
}

// ────────────────────────────────────────────────────────────
// Action 3: 새 비교 분석 실행 + DB 저장
// ────────────────────────────────────────────────────────────

export async function runCompareAnalysis(
  productId: string
): Promise<ActionResult<{ compareId: string; fitScore: number; fitGrade: string }>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };

  try {
    const standard = await prisma.userStandard.findUnique({ where: { userId } });
    if (!standard) {
      return { success: false, error: "개인 기준이 아직 생성되지 않았습니다." };
    }

    const product = await prisma.productMaster.findUnique({
      where: { id: productId },
      include: {
        brand: true,
        ingredients: {
          include: { ingredient: true },
          orderBy: { orderIndex: "asc" },
        },
      },
    });
    if (!product) {
      return { success: false, error: "제품을 찾을 수 없습니다." };
    }

    const skinProfile = await prisma.skinProfile.findUnique({ where: { userId } });

    const request: FitScoreRequest = {
      userStandard: {
        preferredIngredients: standard.preferredIngredients as any,
        avoidIngredients: standard.avoidIngredients as any,
        detectedPatterns: standard.ingredientPatterns as any,
        excludedIngredients: (standard as any).excludedIngredients ?? [],
        overallConfidence: standard.confidenceScore,
        basedOnProductCount: standard.basedOnProductCount,
        explain: { headline: "", skinSummary: "", preferredSummary: "", avoidSummary: "", patternSummary: "", tips: [] },
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

    const fitResult = calculateFitScore(request);

    const saved = await prisma.compareResult.create({
      data: {
        userId,
        userStandardId: standard.id,
        productId: product.id,
        fitScore: fitResult.score,
        fitGrade: fitResult.grade,
        matchedGood: fitResult.reasons as any,
        matchedRisk: fitResult.risks as any,
        missingPreferred: fitResult.missing as any,
        summary: fitResult.summary,
        analysisModel: fitResult.metadata.analysisModel,
        processingTimeMs: fitResult.metadata.processingTimeMs,
      },
    });

    revalidatePath("/(user)/history");
    return {
      success: true,
      data: { compareId: saved.id, fitScore: fitResult.score, fitGrade: fitResult.grade },
    };
  } catch (error) {
    console.error("[runCompareAnalysis Error]", error);
    return { success: false, error: "비교 분석 실행 중 오류가 발생했습니다." };
  }
}

// ────────────────────────────────────────────────────────────
// Action 4: 분석 결과 삭제
// ────────────────────────────────────────────────────────────

export async function deleteCompareResult(
  compareId: string
): Promise<ActionResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };

  try {
    await prisma.compareResult.delete({ where: { id: compareId, userId } });
    revalidatePath("/(user)/history");
    return { success: true };
  } catch (error) {
    console.error("[deleteCompareResult Error]", error);
    return { success: false, error: "삭제 중 오류가 발생했습니다." };
  }
}
