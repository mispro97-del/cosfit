// ============================================================
// COSFIT - Admin Ingredient Knowledge Server Actions
// ============================================================

"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  enrichIngredientKnowledge,
  batchEnrichIngredients,
} from "@/lib/ai/ingredient-knowledge";

// ── Auth Guard ──

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("관리자 권한이 필요합니다.");
  }
  return session.user;
}

// ── Types ──

export interface IngredientKnowledgeItem {
  id: string;
  nameInci: string;
  nameKo: string | null;
  nameEn: string | null;
  safetyGrade: string;
  hasKnowledge: boolean;
  knowledgeUpdatedAt: string | null;
  description: string | null;
}

export interface PaginatedIngredients {
  ingredients: IngredientKnowledgeItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  enrichedCount: number;
  totalCount: number;
}

// ── Actions ──

/**
 * Get paginated ingredients with knowledge status
 */
export async function getIngredientsWithKnowledgeStatus(
  page: number = 1,
  filter: "all" | "enriched" | "not-enriched" = "all",
  search?: string
): Promise<PaginatedIngredients> {
  await requireAdmin();

  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const where: any = {};

  if (filter === "enriched") {
    where.knowledgeData = { not: null };
  } else if (filter === "not-enriched") {
    where.knowledgeData = null;
  }

  if (search && search.length > 0) {
    where.OR = [
      { nameInci: { contains: search, mode: "insensitive" } },
      { nameKo: { contains: search, mode: "insensitive" } },
      { nameEn: { contains: search, mode: "insensitive" } },
    ];
  }

  const [ingredients, total, enrichedCount, totalCount] = await Promise.all([
    prisma.ingredient.findMany({
      where,
      select: {
        id: true,
        nameInci: true,
        nameKo: true,
        nameEn: true,
        safetyGrade: true,
        knowledgeData: true,
        knowledgeUpdatedAt: true,
        description: true,
      },
      orderBy: { nameInci: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.ingredient.count({ where }),
    prisma.ingredient.count({ where: { knowledgeData: { not: Prisma.DbNull } } }),
    prisma.ingredient.count(),
  ]);

  return {
    ingredients: ingredients.map((i) => ({
      id: i.id,
      nameInci: i.nameInci,
      nameKo: i.nameKo,
      nameEn: i.nameEn,
      safetyGrade: i.safetyGrade,
      hasKnowledge: i.knowledgeData !== null,
      knowledgeUpdatedAt: i.knowledgeUpdatedAt?.toISOString() ?? null,
      description: i.description,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    enrichedCount,
    totalCount,
  };
}

/**
 * Enrich knowledge for selected ingredients
 */
export async function enrichSelectedIngredients(ingredientIds: string[]) {
  await requireAdmin();

  if (ingredientIds.length === 0) {
    throw new Error("성분을 선택해주세요.");
  }

  if (ingredientIds.length > 20) {
    throw new Error("한 번에 최대 20개까지 처리할 수 있습니다.");
  }

  const ingredients = await prisma.ingredient.findMany({
    where: { id: { in: ingredientIds } },
    select: { id: true, nameInci: true, nameKo: true, nameEn: true },
  });

  let enriched = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  for (const ingredient of ingredients) {
    try {
      await enrichIngredientKnowledge(ingredient);
      enriched++;
    } catch (err: any) {
      errors++;
      errorDetails.push(`[${ingredient.nameInci}] ${err.message}`);
    }

    // Rate limiting
    if (enriched + errors < ingredients.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return {
    total: ingredients.length,
    enriched,
    errors,
    errorDetails,
  };
}

/**
 * Batch enrich unenriched ingredients
 */
export async function triggerBatchEnrichment(limit: number = 10) {
  await requireAdmin();
  return batchEnrichIngredients(limit);
}

/**
 * Get knowledge detail for a single ingredient
 */
export async function getIngredientKnowledge(ingredientId: string) {
  await requireAdmin();

  const ingredient = await prisma.ingredient.findUnique({
    where: { id: ingredientId },
    select: {
      id: true,
      nameInci: true,
      nameKo: true,
      nameEn: true,
      safetyGrade: true,
      description: true,
      knowledgeData: true,
      knowledgeUpdatedAt: true,
      ewgScore: true,
      category: true,
      function: true,
      commonAllergen: true,
    },
  });

  if (!ingredient) {
    throw new Error("성분을 찾을 수 없습니다.");
  }

  return {
    ...ingredient,
    knowledgeUpdatedAt: ingredient.knowledgeUpdatedAt?.toISOString() ?? null,
  };
}
