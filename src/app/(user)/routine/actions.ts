// ============================================================
// COSFIT - Server Actions: Routine Management & Compatibility Analysis
// src/app/(user)/routine/actions.ts
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

export interface RoutineProduct {
  id: string;
  productId: string;
  productName: string;
  productBrand: string;
  productCategory: string;
  productImage: string | null;
  rating: number | null;
  routineOrder: number | null;
  routineType: string | null;
}

export interface RoutineConflict {
  ingredientA: { id: string; nameInci: string; nameKo: string | null };
  ingredientB: { id: string; nameInci: string; nameKo: string | null };
  description: string | null;
  severity: number;
  productA: string;
  productB: string;
}

export interface RoutineSynergy {
  ingredientA: { id: string; nameInci: string; nameKo: string | null };
  ingredientB: { id: string; nameInci: string; nameKo: string | null };
  description: string | null;
  productA: string;
  productB: string;
}

export interface RoutineAnalysisResult {
  id: string;
  routineType: string;
  overallScore: number;
  conflicts: RoutineConflict[];
  synergies: RoutineSynergy[];
  suggestions: string[];
  analyzedAt: string;
}

// ────────────────────────────────────────────────────────────
// Action 1: Get user's products grouped by routine type
// ────────────────────────────────────────────────────────────

export async function getRoutineProducts(): Promise<
  ActionResult<{ morning: RoutineProduct[]; evening: RoutineProduct[] }>
> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };

  try {
    const userProducts = await prisma.userProduct.findMany({
      where: { userId, isCurrentUse: true },
      include: {
        product: {
          include: { brand: true },
        },
      },
      orderBy: { routineOrder: "asc" },
    });

    const toRoutineProduct = (up: any): RoutineProduct => ({
      id: up.id,
      productId: up.productId,
      productName: up.product.name,
      productBrand: up.product.brand.name,
      productCategory: up.product.category,
      productImage: up.product.imageUrl,
      rating: up.rating,
      routineOrder: up.routineOrder,
      routineType: up.routineType,
    });

    const morning = userProducts
      .filter((up) => up.routineType === "MORNING" || up.routineType === "BOTH")
      .map(toRoutineProduct);

    const evening = userProducts
      .filter((up) => up.routineType === "EVENING" || up.routineType === "BOTH")
      .map(toRoutineProduct);

    return { success: true, data: { morning, evening } };
  } catch (error) {
    console.error("[getRoutineProducts Error]", error);
    return { success: false, error: "루틴 제품 조회 중 오류가 발생했습니다." };
  }
}

// ────────────────────────────────────────────────────────────
// Action 2: Update routine order
// ────────────────────────────────────────────────────────────

export async function updateRoutineOrder(
  productId: string,
  routineType: string,
  order: number
): Promise<ActionResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };

  if (!["MORNING", "EVENING", "BOTH"].includes(routineType)) {
    return { success: false, error: "잘못된 루틴 타입입니다." };
  }
  if (order < 0 || order > 20) {
    return { success: false, error: "잘못된 순서입니다." };
  }

  try {
    await prisma.userProduct.update({
      where: {
        userId_productId: { userId, productId },
      },
      data: {
        routineType,
        routineOrder: order,
      },
    });

    revalidatePath("/(user)/routine");
    return { success: true };
  } catch (error) {
    console.error("[updateRoutineOrder Error]", error);
    return { success: false, error: "루틴 순서 업데이트 중 오류가 발생했습니다." };
  }
}

// ────────────────────────────────────────────────────────────
// Action 3: Analyze routine compatibility
// ────────────────────────────────────────────────────────────

export async function analyzeRoutine(
  routineType: string
): Promise<ActionResult<RoutineAnalysisResult>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };

  if (!["MORNING", "EVENING"].includes(routineType)) {
    return { success: false, error: "잘못된 루틴 타입입니다." };
  }

  try {
    // Get all products in this routine with their ingredients
    const userProducts = await prisma.userProduct.findMany({
      where: {
        userId,
        isCurrentUse: true,
        routineType: { in: [routineType, "BOTH"] },
      },
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
      },
      orderBy: { routineOrder: "asc" },
    });

    if (userProducts.length < 2) {
      return {
        success: false,
        error: "루틴에 최소 2개 이상의 제품이 필요합니다.",
      };
    }

    // Collect all ingredient IDs across products
    const allIngredientIds = new Set<string>();
    const productIngredientMap = new Map<
      string,
      { productName: string; ingredientIds: Set<string> }
    >();

    for (const up of userProducts) {
      const ingIds = new Set<string>();
      for (const pi of up.product.ingredients) {
        allIngredientIds.add(pi.ingredientId);
        ingIds.add(pi.ingredientId);
      }
      productIngredientMap.set(up.product.id, {
        productName: up.product.name,
        ingredientIds: ingIds,
      });
    }

    const ingredientIdArray = Array.from(allIngredientIds);

    // Fetch all interactions for these ingredients
    const interactions = await prisma.ingredientInteraction.findMany({
      where: {
        OR: [
          {
            ingredientAId: { in: ingredientIdArray },
            ingredientBId: { in: ingredientIdArray },
          },
        ],
      },
      include: {
        ingredientA: true,
        ingredientB: true,
      },
    });

    // Categorize interactions
    const conflicts: RoutineConflict[] = [];
    const synergies: RoutineSynergy[] = [];

    for (const interaction of interactions) {
      // Find which products contain these ingredients
      const productsWithA: string[] = [];
      const productsWithB: string[] = [];

      for (const [productId, info] of productIngredientMap) {
        if (info.ingredientIds.has(interaction.ingredientAId)) {
          productsWithA.push(info.productName);
        }
        if (info.ingredientIds.has(interaction.ingredientBId)) {
          productsWithB.push(info.productName);
        }
      }

      // Only flag cross-product interactions (different products)
      const crossProductA = productsWithA.filter(
        (p) => !productsWithB.includes(p)
      );
      const crossProductB = productsWithB.filter(
        (p) => !productsWithA.includes(p)
      );

      const productALabel =
        crossProductA.length > 0
          ? crossProductA[0]
          : productsWithA[0] ?? "알 수 없음";
      const productBLabel =
        crossProductB.length > 0
          ? crossProductB[0]
          : productsWithB[0] ?? "알 수 없음";

      if (interaction.interactionType === "CONFLICT") {
        conflicts.push({
          ingredientA: {
            id: interaction.ingredientAId,
            nameInci: interaction.ingredientA.nameInci,
            nameKo: interaction.ingredientA.nameKo,
          },
          ingredientB: {
            id: interaction.ingredientBId,
            nameInci: interaction.ingredientB.nameInci,
            nameKo: interaction.ingredientB.nameKo,
          },
          description: interaction.description,
          severity: interaction.severity ?? 3,
          productA: productALabel,
          productB: productBLabel,
        });
      } else if (interaction.interactionType === "SYNERGY") {
        synergies.push({
          ingredientA: {
            id: interaction.ingredientAId,
            nameInci: interaction.ingredientA.nameInci,
            nameKo: interaction.ingredientA.nameKo,
          },
          ingredientB: {
            id: interaction.ingredientBId,
            nameInci: interaction.ingredientB.nameInci,
            nameKo: interaction.ingredientB.nameKo,
          },
          description: interaction.description,
          productA: productALabel,
          productB: productBLabel,
        });
      }
    }

    // Calculate overall score
    let overallScore = 80; // base score

    // Penalty for conflicts
    for (const conflict of conflicts) {
      const penalty = conflict.severity * 4; // severity 1-5 -> 4-20 penalty
      overallScore -= penalty;
    }

    // Bonus for synergies
    overallScore += synergies.length * 3;

    // Product count bonus (well-rounded routine)
    if (userProducts.length >= 3 && userProducts.length <= 7) {
      overallScore += 5;
    }

    overallScore = Math.max(0, Math.min(100, Math.round(overallScore)));

    // Generate suggestions
    const suggestions: string[] = [];

    if (conflicts.length > 0) {
      const highSeverity = conflicts.filter((c) => c.severity >= 4);
      if (highSeverity.length > 0) {
        suggestions.push(
          `${highSeverity
            .map(
              (c) =>
                `${c.ingredientA.nameKo ?? c.ingredientA.nameInci}와(과) ${c.ingredientB.nameKo ?? c.ingredientB.nameInci}`
            )
            .join(", ")} 조합은 피부 자극을 유발할 수 있습니다. 사용 순서를 분리하거나 제품 교체를 고려해보세요.`
        );
      }
      if (conflicts.some((c) => c.severity >= 3)) {
        suggestions.push(
          "충돌 성분이 포함된 제품 사이에 충분한 흡수 시간을 두는 것을 권장합니다."
        );
      }
    }

    if (synergies.length === 0 && userProducts.length >= 2) {
      suggestions.push(
        "현재 루틴에서 시너지 효과를 내는 성분 조합이 없습니다. 추천 제품을 확인해보세요."
      );
    }

    // Check for missing categories
    const categories = new Set(
      userProducts.map((up) => up.product.category)
    );
    if (routineType === "MORNING" && !categories.has("SUNSCREEN")) {
      suggestions.push(
        "모닝 루틴에 자외선 차단제가 없습니다. 피부 보호를 위해 추가를 권장합니다."
      );
    }
    if (!categories.has("CLEANSER")) {
      suggestions.push(
        "클렌저가 루틴에 없습니다. 기본 클렌징 단계를 추가해보세요."
      );
    }

    // Sort conflicts by severity descending
    conflicts.sort((a, b) => b.severity - a.severity);

    // Save analysis result
    const saved = await prisma.routineAnalysis.create({
      data: {
        userId,
        routineType,
        overallScore,
        resultJson: JSON.parse(JSON.stringify({
          conflicts,
          synergies,
          suggestions,
          productCount: userProducts.length,
          analyzedProducts: userProducts.map((up) => ({
            id: up.product.id,
            name: up.product.name,
            category: up.product.category,
          })),
        })),
      },
    });

    revalidatePath("/(user)/routine");
    revalidatePath("/(user)/routine/analysis");

    return {
      success: true,
      data: {
        id: saved.id,
        routineType: saved.routineType,
        overallScore: saved.overallScore,
        conflicts,
        synergies,
        suggestions,
        analyzedAt: saved.analyzedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[analyzeRoutine Error]", error);
    return { success: false, error: "루틴 분석 중 오류가 발생했습니다." };
  }
}

// ────────────────────────────────────────────────────────────
// Action 4: Get latest analysis result
// ────────────────────────────────────────────────────────────

export async function getLatestAnalysis(
  routineType: string
): Promise<ActionResult<RoutineAnalysisResult | null>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };

  if (!["MORNING", "EVENING"].includes(routineType)) {
    return { success: false, error: "잘못된 루틴 타입입니다." };
  }

  try {
    const analysis = await prisma.routineAnalysis.findFirst({
      where: { userId, routineType },
      orderBy: { analyzedAt: "desc" },
    });

    if (!analysis) {
      return { success: true, data: null };
    }

    const resultJson = analysis.resultJson as any;

    return {
      success: true,
      data: {
        id: analysis.id,
        routineType: analysis.routineType,
        overallScore: analysis.overallScore,
        conflicts: resultJson.conflicts ?? [],
        synergies: resultJson.synergies ?? [],
        suggestions: resultJson.suggestions ?? [],
        analyzedAt: analysis.analyzedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[getLatestAnalysis Error]", error);
    return { success: false, error: "분석 결과 조회 중 오류가 발생했습니다." };
  }
}
