// ============================================================
// COSFIT - Admin Ingredient Management Server Actions
// ============================================================

"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ── Auth Guard ──

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("관리자 권한이 필요합니다.");
  }
  return session.user;
}

// ── Types ──

export interface IngredientListItem {
  id: string;
  nameInci: string;
  nameKo: string | null;
  safetyGrade: string;
  ewgScore: number | null;
  synonymCount: number;
  interactionCount: number;
}

export interface IngredientDetail {
  id: string;
  nameInci: string;
  nameKo: string | null;
  nameEn: string | null;
  casNumber: string | null;
  category: string | null;
  function: string[];
  safetyGrade: string;
  ewgScore: number | null;
  description: string | null;
  commonAllergen: boolean;
  cosDnaIrritant: number | null;
  cosDnaSafety: number | null;
  synonyms: SynonymItem[];
  interactions: InteractionItem[];
}

export interface SynonymItem {
  id: string;
  synonym: string;
  language: string;
  source: string | null;
}

export interface InteractionItem {
  id: string;
  ingredientAId: string;
  ingredientBId: string;
  ingredientAName: string;
  ingredientBName: string;
  interactionType: string;
  description: string | null;
  severity: number | null;
}

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Actions ──

export async function getIngredients(
  page: number = 1,
  search: string = ""
): Promise<ActionResult<{ items: IngredientListItem[]; total: number; pageSize: number }>> {
  try {
    await requireAdmin();

    const pageSize = 20;
    const skip = (page - 1) * pageSize;

    const where = search
      ? {
          OR: [
            { nameInci: { contains: search, mode: "insensitive" as const } },
            { nameKo: { contains: search, mode: "insensitive" as const } },
            { nameEn: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.ingredient.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { nameInci: "asc" },
        include: {
          _count: {
            select: {
              synonyms: true,
              interactionsA: true,
              interactionsB: true,
            },
          },
        },
      }),
      prisma.ingredient.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: items.map((item) => ({
          id: item.id,
          nameInci: item.nameInci,
          nameKo: item.nameKo,
          safetyGrade: item.safetyGrade,
          ewgScore: item.ewgScore,
          synonymCount: item._count.synonyms,
          interactionCount: item._count.interactionsA + item._count.interactionsB,
        })),
        total,
        pageSize,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message ?? "성분 목록 조회 실패" };
  }
}

export async function getIngredientDetail(
  id: string
): Promise<ActionResult<IngredientDetail>> {
  try {
    await requireAdmin();

    const ingredient = await prisma.ingredient.findUnique({
      where: { id },
      include: {
        synonyms: { orderBy: { language: "asc" } },
        interactionsA: {
          include: {
            ingredientA: { select: { nameInci: true } },
            ingredientB: { select: { nameInci: true } },
          },
        },
        interactionsB: {
          include: {
            ingredientA: { select: { nameInci: true } },
            ingredientB: { select: { nameInci: true } },
          },
        },
      },
    });

    if (!ingredient) {
      return { success: false, error: "성분을 찾을 수 없습니다." };
    }

    const allInteractions = [
      ...ingredient.interactionsA,
      ...ingredient.interactionsB,
    ];

    return {
      success: true,
      data: {
        id: ingredient.id,
        nameInci: ingredient.nameInci,
        nameKo: ingredient.nameKo,
        nameEn: ingredient.nameEn,
        casNumber: ingredient.casNumber,
        category: ingredient.category,
        function: ingredient.function,
        safetyGrade: ingredient.safetyGrade,
        ewgScore: ingredient.ewgScore,
        description: ingredient.description,
        commonAllergen: ingredient.commonAllergen,
        cosDnaIrritant: ingredient.cosDnaIrritant,
        cosDnaSafety: ingredient.cosDnaSafety,
        synonyms: ingredient.synonyms.map((s) => ({
          id: s.id,
          synonym: s.synonym,
          language: s.language,
          source: s.source,
        })),
        interactions: allInteractions.map((i) => ({
          id: i.id,
          ingredientAId: i.ingredientAId,
          ingredientBId: i.ingredientBId,
          ingredientAName: i.ingredientA.nameInci,
          ingredientBName: i.ingredientB.nameInci,
          interactionType: i.interactionType,
          description: i.description,
          severity: i.severity,
        })),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message ?? "성분 상세 조회 실패" };
  }
}

export async function addSynonym(
  ingredientId: string,
  synonym: string,
  language: string
): Promise<ActionResult<SynonymItem>> {
  try {
    await requireAdmin();

    if (!synonym.trim()) {
      return { success: false, error: "동의어를 입력해주세요." };
    }

    const created = await prisma.ingredientSynonym.create({
      data: {
        ingredientId,
        synonym: synonym.trim(),
        language,
      },
    });

    revalidatePath("/admin/ingredients");
    return {
      success: true,
      data: {
        id: created.id,
        synonym: created.synonym,
        language: created.language,
        source: created.source,
      },
    };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "이미 등록된 동의어입니다." };
    }
    return { success: false, error: error.message ?? "동의어 추가 실패" };
  }
}

export async function removeSynonym(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    await prisma.ingredientSynonym.delete({ where: { id } });

    revalidatePath("/admin/ingredients");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message ?? "동의어 삭제 실패" };
  }
}

export async function addInteraction(
  ingredientAId: string,
  ingredientBId: string,
  type: string,
  description: string,
  severity: number | null
): Promise<ActionResult<InteractionItem>> {
  try {
    await requireAdmin();

    if (ingredientAId === ingredientBId) {
      return { success: false, error: "같은 성분 간 상호작용은 등록할 수 없습니다." };
    }

    const created = await prisma.ingredientInteraction.create({
      data: {
        ingredientAId,
        ingredientBId,
        interactionType: type,
        description: description || null,
        severity,
      },
      include: {
        ingredientA: { select: { nameInci: true } },
        ingredientB: { select: { nameInci: true } },
      },
    });

    revalidatePath("/admin/ingredients");
    return {
      success: true,
      data: {
        id: created.id,
        ingredientAId: created.ingredientAId,
        ingredientBId: created.ingredientBId,
        ingredientAName: created.ingredientA.nameInci,
        ingredientBName: created.ingredientB.nameInci,
        interactionType: created.interactionType,
        description: created.description,
        severity: created.severity,
      },
    };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "이미 등록된 상호작용입니다." };
    }
    return { success: false, error: error.message ?? "상호작용 추가 실패" };
  }
}

export async function removeInteraction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    await prisma.ingredientInteraction.delete({ where: { id } });

    revalidatePath("/admin/ingredients");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message ?? "상호작용 삭제 실패" };
  }
}

// ── Helper: 성분 검색 (상호작용 추가 시 상대 성분 검색용) ──

export async function searchIngredients(
  query: string
): Promise<ActionResult<{ id: string; nameInci: string; nameKo: string | null }[]>> {
  try {
    await requireAdmin();

    if (!query.trim()) return { success: true, data: [] };

    const results = await prisma.ingredient.findMany({
      where: {
        OR: [
          { nameInci: { contains: query, mode: "insensitive" } },
          { nameKo: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, nameInci: true, nameKo: true },
      take: 10,
      orderBy: { nameInci: "asc" },
    });

    return { success: true, data: results };
  } catch (error: any) {
    return { success: false, error: error.message ?? "성분 검색 실패" };
  }
}
