// ============================================================
// COSFIT - Server Actions: 사용자 제품 관리
// app/(user)/my-products/actions.ts
// ============================================================
// 사용자가 등록한 제품 CRUD + 제품 검색
// 모든 action에서 getServerSession으로 userId 획득 (IDOR 방지)
// ============================================================

"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UserProductItem {
  id: string;
  productId: string;
  productName: string;
  brandName: string;
  category: string;
  imageUrl: string | null;
  usagePeriod: number | null;
  rating: number | null;
  review: string | null;
  isCurrentUse: boolean;
  routineType: string | null;
  routineOrder: number | null;
  createdAt: string;
}

export interface SearchProductItem {
  id: string;
  name: string;
  brandName: string;
  category: string;
  imageUrl: string | null;
}

// ────────────────────────────────────────────────────────────
// 내 제품 목록 조회
// ────────────────────────────────────────────────────────────

export async function getUserProducts(): Promise<ActionResult<UserProductItem[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "로그인이 필요합니다." };
    }

    const userProducts = await prisma.userProduct.findMany({
      where: { userId: session.user.id },
      include: {
        product: {
          include: { brand: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data: UserProductItem[] = userProducts.map((up) => ({
      id: up.id,
      productId: up.productId,
      productName: up.product.name,
      brandName: up.product.brand.nameKo ?? up.product.brand.name,
      category: up.product.category,
      imageUrl: up.product.imageUrl,
      usagePeriod: up.usagePeriod,
      rating: up.rating,
      review: up.review,
      isCurrentUse: up.isCurrentUse,
      routineType: up.routineType,
      routineOrder: up.routineOrder,
      createdAt: up.createdAt.toISOString(),
    }));

    return { success: true, data };
  } catch (error) {
    console.error("[getUserProducts Error]", error);
    return { success: false, error: "제품 목록을 불러오는 중 오류가 발생했습니다." };
  }
}

// ────────────────────────────────────────────────────────────
// 제품 등록
// ────────────────────────────────────────────────────────────

export async function addUserProduct(
  productId: string,
  data: {
    routineType?: string;
    usagePeriod?: number;
    rating?: number;
    review?: string;
  }
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "로그인이 필요합니다." };
    }

    if (!productId) {
      return { success: false, error: "제품을 선택해주세요." };
    }

    // 제품 존재 여부 확인
    const product = await prisma.productMaster.findUnique({
      where: { id: productId },
    });
    if (!product) {
      return { success: false, error: "존재하지 않는 제품입니다." };
    }

    // 이미 등록된 제품인지 확인
    const existing = await prisma.userProduct.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId,
        },
      },
    });
    if (existing) {
      return { success: false, error: "이미 등록된 제품입니다." };
    }

    // rating 범위 검증
    if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
      return { success: false, error: "별점은 1~5 사이로 입력해주세요." };
    }

    // routineType 검증
    const validRoutineTypes = ["MORNING", "EVENING", "BOTH"];
    if (data.routineType && !validRoutineTypes.includes(data.routineType)) {
      return { success: false, error: "유효하지 않은 루틴 타입입니다." };
    }

    const userProduct = await prisma.userProduct.create({
      data: {
        userId: session.user.id,
        productId,
        routineType: data.routineType || null,
        usagePeriod: data.usagePeriod || null,
        rating: data.rating || null,
        review: data.review || null,
        isCurrentUse: true,
      },
    });

    return { success: true, data: { id: userProduct.id } };
  } catch (error) {
    console.error("[addUserProduct Error]", error);
    return { success: false, error: "제품 등록 중 오류가 발생했습니다." };
  }
}

// ────────────────────────────────────────────────────────────
// 제품 삭제
// ────────────────────────────────────────────────────────────

export async function removeUserProduct(
  id: string
): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "로그인이 필요합니다." };
    }

    // 본인 소유 제품인지 확인
    const userProduct = await prisma.userProduct.findUnique({
      where: { id },
    });

    if (!userProduct) {
      return { success: false, error: "제품을 찾을 수 없습니다." };
    }

    if (userProduct.userId !== session.user.id) {
      return { success: false, error: "삭제 권한이 없습니다." };
    }

    await prisma.userProduct.delete({ where: { id } });

    return { success: true };
  } catch (error) {
    console.error("[removeUserProduct Error]", error);
    return { success: false, error: "제품 삭제 중 오류가 발생했습니다." };
  }
}

// ────────────────────────────────────────────────────────────
// 제품 검색 (ProductMaster에서 name/brand 검색)
// ────────────────────────────────────────────────────────────

export async function searchProducts(
  query: string
): Promise<ActionResult<SearchProductItem[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "로그인이 필요합니다." };
    }

    if (!query || query.trim().length < 1) {
      return { success: true, data: [] };
    }

    const trimmed = query.trim();

    const products = await prisma.productMaster.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { name: { contains: trimmed, mode: "insensitive" } },
          { brand: { name: { contains: trimmed, mode: "insensitive" } } },
          { brand: { nameKo: { contains: trimmed, mode: "insensitive" } } },
        ],
      },
      include: { brand: true },
      take: 20,
      orderBy: { name: "asc" },
    });

    const data: SearchProductItem[] = products.map((p) => ({
      id: p.id,
      name: p.name,
      brandName: p.brand.nameKo ?? p.brand.name,
      category: p.category,
      imageUrl: p.imageUrl,
    }));

    return { success: true, data };
  } catch (error) {
    console.error("[searchProducts Error]", error);
    return { success: false, error: "제품 검색 중 오류가 발생했습니다." };
  }
}
