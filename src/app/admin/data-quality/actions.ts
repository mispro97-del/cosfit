"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ── Admin Guard ──

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("관리자 권한이 필요합니다.");
  }
  return session;
}

// ── Types ──

export interface FieldCompleteness {
  field: string;
  label: string;
  total: number;
  filled: number;
  percentage: number;
}

export interface EntityOverview {
  entityType: string;
  label: string;
  totalCount: number;
  overallCompleteness: number;
  fields: FieldCompleteness[];
}

export interface QualityHistoryItem {
  id: string;
  entityType: string;
  totalCount: number;
  missingRate: number;
  details: Record<string, number> | null;
  checkedAt: string;
}

export interface MissingDataItem {
  id: string;
  name: string;
  missingFields: string[];
}

// ── Actions ──

export async function getDataQualityOverview(): Promise<{
  success: boolean;
  data?: EntityOverview[];
  error?: string;
}> {
  try {
    await requireAdmin();

    // --- Products ---
    const productTotal = await prisma.productMaster.count();
    const productWithBrand = await prisma.productMaster.count({
      where: { brandId: { not: undefined } },
    });
    const productWithIngredients = await prisma.productMaster.count({
      where: { ingredients: { some: {} } },
    });
    const productWithCategory = await prisma.productMaster.count({
      where: { category: { not: undefined } },
    });
    const productWithImage = await prisma.productMaster.count({
      where: { imageUrl: { not: null } },
    });
    const productWithDescription = await prisma.productMaster.count({
      where: { description: { not: null } },
    });

    const productFields: FieldCompleteness[] = [
      { field: "brand", label: "브랜드", total: productTotal, filled: productWithBrand, percentage: productTotal ? Math.round((productWithBrand / productTotal) * 100) : 0 },
      { field: "ingredients", label: "성분 매핑", total: productTotal, filled: productWithIngredients, percentage: productTotal ? Math.round((productWithIngredients / productTotal) * 100) : 0 },
      { field: "category", label: "카테고리", total: productTotal, filled: productWithCategory, percentage: productTotal ? Math.round((productWithCategory / productTotal) * 100) : 0 },
      { field: "imageUrl", label: "이미지", total: productTotal, filled: productWithImage, percentage: productTotal ? Math.round((productWithImage / productTotal) * 100) : 0 },
      { field: "description", label: "설명", total: productTotal, filled: productWithDescription, percentage: productTotal ? Math.round((productWithDescription / productTotal) * 100) : 0 },
    ];

    const productOverall = productTotal
      ? Math.round(productFields.reduce((sum, f) => sum + f.percentage, 0) / productFields.length)
      : 0;

    // --- Ingredients ---
    const ingredientTotal = await prisma.ingredient.count();
    const ingredientWithSafetyGrade = await prisma.ingredient.count({
      where: { safetyGrade: { not: "UNKNOWN" } },
    });
    const ingredientWithDescription = await prisma.ingredient.count({
      where: { description: { not: null } },
    });
    const ingredientWithNameKo = await prisma.ingredient.count({
      where: { nameKo: { not: null } },
    });
    const ingredientWithSynonyms = await prisma.ingredient.count({
      where: { synonyms: { some: {} } },
    });
    const ingredientWithInteractions = await prisma.ingredient.count({
      where: {
        OR: [
          { interactionsA: { some: {} } },
          { interactionsB: { some: {} } },
        ],
      },
    });

    const ingredientFields: FieldCompleteness[] = [
      { field: "safetyGrade", label: "안전등급", total: ingredientTotal, filled: ingredientWithSafetyGrade, percentage: ingredientTotal ? Math.round((ingredientWithSafetyGrade / ingredientTotal) * 100) : 0 },
      { field: "description", label: "설명", total: ingredientTotal, filled: ingredientWithDescription, percentage: ingredientTotal ? Math.round((ingredientWithDescription / ingredientTotal) * 100) : 0 },
      { field: "nameKo", label: "한글명", total: ingredientTotal, filled: ingredientWithNameKo, percentage: ingredientTotal ? Math.round((ingredientWithNameKo / ingredientTotal) * 100) : 0 },
      { field: "synonyms", label: "동의어", total: ingredientTotal, filled: ingredientWithSynonyms, percentage: ingredientTotal ? Math.round((ingredientWithSynonyms / ingredientTotal) * 100) : 0 },
      { field: "interactions", label: "상호작용", total: ingredientTotal, filled: ingredientWithInteractions, percentage: ingredientTotal ? Math.round((ingredientWithInteractions / ingredientTotal) * 100) : 0 },
    ];

    const ingredientOverall = ingredientTotal
      ? Math.round(ingredientFields.reduce((sum, f) => sum + f.percentage, 0) / ingredientFields.length)
      : 0;

    // --- Reviews ---
    const reviewTotal = await prisma.review.count();
    const reviewWithSentiment = await prisma.review.count({
      where: { aiSentiment: { not: null } },
    });
    const reviewWithSummary = await prisma.review.count({
      where: { aiSummary: { not: null } },
    });
    const reviewApproved = await prisma.review.count({
      where: { status: "APPROVED" },
    });
    const reviewPending = await prisma.review.count({
      where: { status: "PENDING" },
    });

    const reviewFields: FieldCompleteness[] = [
      { field: "aiSentiment", label: "감성분석", total: reviewTotal, filled: reviewWithSentiment, percentage: reviewTotal ? Math.round((reviewWithSentiment / reviewTotal) * 100) : 0 },
      { field: "aiSummary", label: "AI 요약", total: reviewTotal, filled: reviewWithSummary, percentage: reviewTotal ? Math.round((reviewWithSummary / reviewTotal) * 100) : 0 },
      { field: "approved", label: "승인 완료", total: reviewTotal, filled: reviewApproved, percentage: reviewTotal ? Math.round((reviewApproved / reviewTotal) * 100) : 0 },
      { field: "pending", label: "대기중", total: reviewTotal, filled: reviewPending, percentage: reviewTotal ? Math.round((reviewPending / reviewTotal) * 100) : 0 },
    ];

    const reviewOverall = reviewTotal
      ? Math.round(reviewFields.filter((f) => f.field !== "pending").reduce((sum, f) => sum + f.percentage, 0) / reviewFields.filter((f) => f.field !== "pending").length)
      : 0;

    return {
      success: true,
      data: [
        { entityType: "PRODUCT", label: "제품", totalCount: productTotal, overallCompleteness: productOverall, fields: productFields },
        { entityType: "INGREDIENT", label: "성분", totalCount: ingredientTotal, overallCompleteness: ingredientOverall, fields: ingredientFields },
        { entityType: "REVIEW", label: "리뷰", totalCount: reviewTotal, overallCompleteness: reviewOverall, fields: reviewFields },
      ],
    };
  } catch (error: any) {
    return { success: false, error: error.message ?? "데이터 품질 조회 실패" };
  }
}

export async function runQualityCheck(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await requireAdmin();

    // Product quality
    const productTotal = await prisma.productMaster.count();
    const productMissingImage = await prisma.productMaster.count({ where: { imageUrl: null } });
    const productMissingDesc = await prisma.productMaster.count({ where: { description: null } });
    const productMissingIngredients = productTotal - await prisma.productMaster.count({ where: { ingredients: { some: {} } } });

    const productMissingRate = productTotal
      ? Math.round(((productMissingImage + productMissingDesc + productMissingIngredients) / (productTotal * 3)) * 10000) / 100
      : 0;

    await prisma.dataQualityLog.create({
      data: {
        entityType: "PRODUCT",
        totalCount: productTotal,
        missingRate: productMissingRate,
        details: {
          missingImage: productMissingImage,
          missingDescription: productMissingDesc,
          missingIngredients: productMissingIngredients,
        },
      },
    });

    // Ingredient quality
    const ingredientTotal = await prisma.ingredient.count();
    const ingredientUnknownGrade = await prisma.ingredient.count({ where: { safetyGrade: "UNKNOWN" } });
    const ingredientMissingDesc = await prisma.ingredient.count({ where: { description: null } });
    const ingredientMissingNameKo = await prisma.ingredient.count({ where: { nameKo: null } });

    const ingredientMissingRate = ingredientTotal
      ? Math.round(((ingredientUnknownGrade + ingredientMissingDesc + ingredientMissingNameKo) / (ingredientTotal * 3)) * 10000) / 100
      : 0;

    await prisma.dataQualityLog.create({
      data: {
        entityType: "INGREDIENT",
        totalCount: ingredientTotal,
        missingRate: ingredientMissingRate,
        details: {
          unknownSafetyGrade: ingredientUnknownGrade,
          missingDescription: ingredientMissingDesc,
          missingNameKo: ingredientMissingNameKo,
        },
      },
    });

    // Review quality
    const reviewTotal = await prisma.review.count();
    const reviewMissingSentiment = await prisma.review.count({ where: { aiSentiment: null } });
    const reviewMissingSummary = await prisma.review.count({ where: { aiSummary: null } });

    const reviewMissingRate = reviewTotal
      ? Math.round(((reviewMissingSentiment + reviewMissingSummary) / (reviewTotal * 2)) * 10000) / 100
      : 0;

    await prisma.dataQualityLog.create({
      data: {
        entityType: "REVIEW",
        totalCount: reviewTotal,
        missingRate: reviewMissingRate,
        details: {
          missingSentiment: reviewMissingSentiment,
          missingSummary: reviewMissingSummary,
        },
      },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message ?? "품질 체크 실행 실패" };
  }
}

export async function getQualityHistory(
  entityType: string,
  limit: number = 10
): Promise<{
  success: boolean;
  data?: QualityHistoryItem[];
  error?: string;
}> {
  try {
    await requireAdmin();

    const logs = await prisma.dataQualityLog.findMany({
      where: { entityType },
      orderBy: { checkedAt: "desc" },
      take: limit,
    });

    return {
      success: true,
      data: logs.map((l) => ({
        id: l.id,
        entityType: l.entityType,
        totalCount: l.totalCount,
        missingRate: l.missingRate,
        details: l.details as Record<string, number> | null,
        checkedAt: l.checkedAt.toISOString(),
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message ?? "품질 이력 조회 실패" };
  }
}

export async function getDetailedMissingData(entityType: string): Promise<{
  success: boolean;
  data?: MissingDataItem[];
  error?: string;
}> {
  try {
    await requireAdmin();

    const items: MissingDataItem[] = [];

    if (entityType === "PRODUCT") {
      const products = await prisma.productMaster.findMany({
        where: {
          OR: [
            { imageUrl: null },
            { description: null },
          ],
        },
        select: { id: true, name: true, imageUrl: true, description: true },
        take: 50,
      });

      for (const p of products) {
        const missing: string[] = [];
        if (!p.imageUrl) missing.push("이미지");
        if (!p.description) missing.push("설명");
        items.push({ id: p.id, name: p.name, missingFields: missing });
      }
    } else if (entityType === "INGREDIENT") {
      const ingredients = await prisma.ingredient.findMany({
        where: {
          OR: [
            { safetyGrade: "UNKNOWN" },
            { description: null },
            { nameKo: null },
          ],
        },
        select: { id: true, nameInci: true, nameKo: true, safetyGrade: true, description: true },
        take: 50,
      });

      for (const i of ingredients) {
        const missing: string[] = [];
        if (i.safetyGrade === "UNKNOWN") missing.push("안전등급");
        if (!i.description) missing.push("설명");
        if (!i.nameKo) missing.push("한글명");
        items.push({ id: i.id, name: i.nameKo ?? i.nameInci, missingFields: missing });
      }
    } else if (entityType === "REVIEW") {
      const reviews = await prisma.review.findMany({
        where: {
          OR: [
            { aiSentiment: null },
            { aiSummary: null },
          ],
        },
        include: { product: { select: { name: true } } },
        take: 50,
      });

      for (const r of reviews) {
        const missing: string[] = [];
        if (!r.aiSentiment) missing.push("감성분석");
        if (!r.aiSummary) missing.push("AI 요약");
        items.push({ id: r.id, name: `${r.product.name} - 리뷰 #${r.id.slice(-6)}`, missingFields: missing });
      }
    }

    return { success: true, data: items };
  } catch (error: any) {
    return { success: false, error: error.message ?? "누락 데이터 조회 실패" };
  }
}
