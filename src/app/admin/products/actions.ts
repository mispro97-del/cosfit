// ============================================================
// COSFIT - Admin Product Management Server Actions
// 제품 관리: 목록, 검색, 추가, 성분 파싱/매칭
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

export interface ProductListItem {
  id: string;
  name: string;
  brandName: string;
  brandNameKo: string | null;
  category: string;
  status: string;
  dataStatus: string;
  ingredientCount: number;
  imageUrl: string | null;
  kfdaReportNo: string | null;
  createdAt: string;
}

export interface ParsedIngredient {
  index: number;
  rawName: string;
  matchedId: string | null;
  matchedNameInci: string | null;
  matchedNameKo: string | null;
  matchedSafetyGrade: string | null;
  isMatched: boolean;
}

export interface BrandOption {
  id: string;
  name: string;
  nameKo: string | null;
}

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Product List ──

export async function getProductList(
  page: number = 1,
  search: string = "",
  categoryFilter: string = "",
  statusFilter: string = ""
): Promise<
  ActionResult<{
    items: ProductListItem[];
    total: number;
    pageSize: number;
  }>
> {
  try {
    await requireAdmin();

    const pageSize = 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { brand: { name: { contains: search, mode: "insensitive" } } },
        { brand: { nameKo: { contains: search, mode: "insensitive" } } },
        { kfdaReportNo: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryFilter) {
      where.category = categoryFilter;
    }

    if (statusFilter) {
      where.status = statusFilter;
    }

    const [items, total] = await Promise.all([
      prisma.productMaster.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          brand: { select: { name: true, nameKo: true } },
          _count: { select: { ingredients: true } },
        },
      }),
      prisma.productMaster.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          brandName: item.brand.name,
          brandNameKo: item.brand.nameKo,
          category: item.category,
          status: item.status,
          dataStatus: item.dataStatus,
          ingredientCount: item._count.ingredients,
          imageUrl: item.imageUrl,
          kfdaReportNo: item.kfdaReportNo,
          createdAt: item.createdAt.toISOString(),
        })),
        total,
        pageSize,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message ?? "제품 목록 조회 실패" };
  }
}

// ── Parse Ingredients ──

export async function parseIngredients(
  rawText: string
): Promise<ActionResult<ParsedIngredient[]>> {
  try {
    await requireAdmin();

    if (!rawText.trim()) {
      return { success: false, error: "전성분 텍스트를 입력해주세요." };
    }

    // 콤마, 줄바꿈, 세미콜론으로 분리
    const rawNames = rawText
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (rawNames.length === 0) {
      return { success: false, error: "파싱할 수 있는 성분이 없습니다." };
    }

    // DB에서 모든 성분 + 동의어 조회 (대소문자 무시 매칭용)
    const allIngredients = await prisma.ingredient.findMany({
      select: {
        id: true,
        nameInci: true,
        nameKo: true,
        safetyGrade: true,
        synonyms: {
          select: { synonym: true },
        },
      },
    });

    // 매칭용 인덱스 구축
    const matchIndex = new Map<
      string,
      { id: string; nameInci: string; nameKo: string | null; safetyGrade: string }
    >();

    for (const ing of allIngredients) {
      const entry = {
        id: ing.id,
        nameInci: ing.nameInci,
        nameKo: ing.nameKo,
        safetyGrade: ing.safetyGrade,
      };

      // INCI명으로 매칭
      matchIndex.set(ing.nameInci.toLowerCase(), entry);

      // 한국명으로 매칭
      if (ing.nameKo) {
        matchIndex.set(ing.nameKo.toLowerCase(), entry);
      }

      // 동의어로 매칭
      for (const syn of ing.synonyms) {
        matchIndex.set(syn.synonym.toLowerCase(), entry);
      }
    }

    // 각 성분명에 대해 매칭 시도
    const parsed: ParsedIngredient[] = rawNames.map((rawName, index) => {
      // 괄호 제거 후 매칭 시도
      const cleanName = rawName
        .replace(/\s*\([^)]*\)\s*$/, "")
        .trim()
        .toLowerCase();

      const match = matchIndex.get(cleanName) || matchIndex.get(rawName.toLowerCase());

      return {
        index,
        rawName,
        matchedId: match?.id ?? null,
        matchedNameInci: match?.nameInci ?? null,
        matchedNameKo: match?.nameKo ?? null,
        matchedSafetyGrade: match?.safetyGrade ?? null,
        isMatched: !!match,
      };
    });

    return { success: true, data: parsed };
  } catch (error: any) {
    return { success: false, error: error.message ?? "성분 파싱 실패" };
  }
}

// ── Search Ingredients for Manual Mapping ──

export async function searchIngredientsForMapping(
  query: string
): Promise<
  ActionResult<
    { id: string; nameInci: string; nameKo: string | null; safetyGrade: string }[]
  >
> {
  try {
    await requireAdmin();

    if (!query.trim()) return { success: true, data: [] };

    const results = await prisma.ingredient.findMany({
      where: {
        OR: [
          { nameInci: { contains: query, mode: "insensitive" } },
          { nameKo: { contains: query, mode: "insensitive" } },
          { nameEn: { contains: query, mode: "insensitive" } },
          {
            synonyms: {
              some: { synonym: { contains: query, mode: "insensitive" } },
            },
          },
        ],
      },
      select: {
        id: true,
        nameInci: true,
        nameKo: true,
        safetyGrade: true,
      },
      take: 10,
      orderBy: { nameInci: "asc" },
    });

    return { success: true, data: results };
  } catch (error: any) {
    return { success: false, error: error.message ?? "성분 검색 실패" };
  }
}

// ── Get Brands ──

export async function getBrands(): Promise<ActionResult<BrandOption[]>> {
  try {
    await requireAdmin();

    const brands = await prisma.brand.findMany({
      select: { id: true, name: true, nameKo: true },
      orderBy: { name: "asc" },
    });

    return { success: true, data: brands };
  } catch (error: any) {
    return { success: false, error: error.message ?? "브랜드 목록 조회 실패" };
  }
}

// ── Add Product ──

export async function addProduct(data: {
  name: string;
  brandId: string;
  newBrandName?: string;
  category: string;
  imageUrl?: string;
  rawIngredients: string;
  ingredients: { rawName: string; ingredientId: string | null; orderIndex: number }[];
}): Promise<ActionResult<{ productId: string }>> {
  try {
    await requireAdmin();

    // Validation
    if (!data.name.trim()) {
      return { success: false, error: "제품명을 입력해주세요." };
    }

    if (!data.brandId && !data.newBrandName?.trim()) {
      return { success: false, error: "브랜드를 선택하거나 새로 입력해주세요." };
    }

    if (!data.category) {
      return { success: false, error: "카테고리를 선택해주세요." };
    }

    // Brand 처리
    let brandId = data.brandId;
    if (!brandId && data.newBrandName?.trim()) {
      // 새 브랜드 생성 또는 기존 브랜드 찾기
      const existingBrand = await prisma.brand.findUnique({
        where: { name: data.newBrandName.trim() },
      });

      if (existingBrand) {
        brandId = existingBrand.id;
      } else {
        const newBrand = await prisma.brand.create({
          data: {
            name: data.newBrandName.trim(),
            nameKo: data.newBrandName.trim(),
          },
        });
        brandId = newBrand.id;
      }
    }

    // 트랜잭션으로 제품 + 성분 매핑 생성
    const product = await prisma.$transaction(async (tx) => {
      // 1. 제품 생성
      const product = await tx.productMaster.create({
        data: {
          name: data.name.trim(),
          brandId,
          category: data.category as any,
          imageUrl: data.imageUrl?.trim() || null,
          rawIngredients: data.rawIngredients,
          ingredientCount: data.ingredients.filter((i) => i.ingredientId).length,
          status: "ACTIVE",
          dataStatus: data.ingredients.some((i) => !i.ingredientId)
            ? "QUALITY_ISSUE"
            : "SUCCESS",
        },
      });

      // 2. 매칭된 성분만 ProductIngredient로 연결
      const matchedIngredients = data.ingredients.filter((i) => i.ingredientId);
      if (matchedIngredients.length > 0) {
        await tx.productIngredient.createMany({
          data: matchedIngredients.map((ing) => ({
            productId: product.id,
            ingredientId: ing.ingredientId!,
            orderIndex: ing.orderIndex,
          })),
          skipDuplicates: true,
        });
      }

      return product;
    });

    revalidatePath("/admin/products");

    return { success: true, data: { productId: product.id } };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "중복된 제품 정보가 있습니다." };
    }
    return { success: false, error: error.message ?? "제품 추가 실패" };
  }
}

// ── Product Stats ──

export async function getProductStats(): Promise<
  ActionResult<{
    total: number;
    byStatus: Record<string, number>;
    byDataStatus: Record<string, number>;
    byCategory: Record<string, number>;
  }>
> {
  try {
    await requireAdmin();

    const [total, statusGroups, dataStatusGroups, categoryGroups] = await Promise.all([
      prisma.productMaster.count(),
      prisma.productMaster.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.productMaster.groupBy({
        by: ["dataStatus"],
        _count: { _all: true },
      }),
      prisma.productMaster.groupBy({
        by: ["category"],
        _count: { _all: true },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const g of statusGroups) {
      byStatus[g.status] = g._count._all;
    }

    const byDataStatus: Record<string, number> = {};
    for (const g of dataStatusGroups) {
      byDataStatus[g.dataStatus] = g._count._all;
    }

    const byCategory: Record<string, number> = {};
    for (const g of categoryGroups) {
      byCategory[g.category] = g._count._all;
    }

    return { success: true, data: { total, byStatus, byDataStatus, byCategory } };
  } catch (error: any) {
    return { success: false, error: error.message ?? "통계 조회 실패" };
  }
}
