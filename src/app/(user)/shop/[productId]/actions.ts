"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const SKIN_TYPE_LABEL: Record<string, string> = {
  DRY: "건성",
  OILY: "지성",
  COMBINATION: "복합성",
  SENSITIVE: "민감성",
  NORMAL: "중성",
};

const CATEGORY_LABEL: Record<string, string> = {
  CLEANSER: "클렌저",
  TONER: "토너",
  SERUM: "세럼",
  EMULSION: "에멀전",
  CREAM: "크림",
  SUNSCREEN: "선크림",
  MASK: "마스크",
  EYE_CARE: "아이케어",
  LIP_CARE: "립케어",
  BODY_CARE: "바디케어",
  MAKEUP_BASE: "메이크업베이스",
  OTHER: "기타",
};

export async function getProductDetail(productId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const product = await prisma.productMaster.findUnique({
    where: { id: productId },
    include: {
      brand: { select: { name: true, nameKo: true } },
      ingredients: {
        include: {
          ingredient: {
            select: {
              nameInci: true,
              nameKo: true,
              safetyGrade: true,
              ewgScore: true,
            },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
      partnerProducts: {
        include: {
          variants: {
            where: { isActive: true },
            orderBy: { price: "asc" },
          },
          images: {
            orderBy: { sortOrder: "asc" },
          },
          description: true,
        },
        take: 1,
      },
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          rating: true,
          content: true,
          pros: true,
          cons: true,
          skinTypeAtReview: true,
          createdAt: true,
          user: { select: { nickname: true, name: true } },
        },
      },
    },
  });

  if (!product) return null;

  const partnerProduct = product.partnerProducts[0] ?? null;

  return {
    id: product.id,
    name: product.name,
    brandName: product.brand.nameKo || product.brand.name,
    category: product.category,
    categoryLabel: CATEGORY_LABEL[product.category] || product.category,
    description: product.description,
    imageUrl: product.imageUrl,
    partnerProduct: partnerProduct
      ? {
          id: partnerProduct.id,
          variants: partnerProduct.variants.map((v) => ({
            id: v.id,
            optionName: v.optionName,
            optionType: v.optionType,
            price: v.price,
            originalPrice: v.originalPrice,
            stock: v.stock,
          })),
          images: partnerProduct.images.map((img) => ({
            imageUrl: img.imageUrl,
            isMain: img.isMain,
            alt: img.alt,
          })),
          description: partnerProduct.description
            ? {
                content: partnerProduct.description.content,
                shortDesc: partnerProduct.description.shortDesc,
                highlights: partnerProduct.description.highlights as string[] | null,
              }
            : null,
        }
      : null,
    ingredients: product.ingredients.map((pi) => ({
      name: pi.ingredient.nameKo || pi.ingredient.nameInci,
      nameInci: pi.ingredient.nameInci,
      safetyGrade: pi.ingredient.safetyGrade,
      ewgScore: pi.ingredient.ewgScore,
    })),
    reviews: product.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      pros: r.pros,
      cons: r.cons,
      skinType: r.skinTypeAtReview
        ? SKIN_TYPE_LABEL[r.skinTypeAtReview] || r.skinTypeAtReview
        : null,
      authorName: r.user.nickname || r.user.name || "익명",
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function getProductFitScore(productId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const userId = session.user.id;

  // Check if user has a standard
  const userStandard = await prisma.userStandard.findUnique({
    where: { userId },
  });
  if (!userStandard) return null;

  // Check for existing compare result
  const existingResult = await prisma.compareResult.findFirst({
    where: { userId, productId },
    orderBy: { createdAt: "desc" },
    select: {
      fitScore: true,
      fitGrade: true,
      summary: true,
    },
  });

  if (existingResult) {
    return {
      fitScore: existingResult.fitScore,
      fitGrade: existingResult.fitGrade,
      summary: existingResult.summary,
    };
  }

  // No existing result — return null (user can trigger analysis from compare page)
  return null;
}

export async function addToCart(productId: string, quantity: number = 1) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const userId = session.user.id;

  // Get product price
  const product = await prisma.productMaster.findUnique({
    where: { id: productId },
    select: { price: true, status: true },
  });

  if (!product || product.status !== "ACTIVE") {
    return { success: false, error: "현재 구매할 수 없는 제품입니다." };
  }

  const unitPrice = product.price ?? 0;

  try {
    await prisma.cartItem.upsert({
      where: {
        userId_productId: { userId, productId },
      },
      update: {
        quantity: { increment: quantity },
      },
      create: {
        userId,
        productId,
        quantity,
        unitPrice,
      },
    });

    return { success: true };
  } catch {
    return { success: false, error: "장바구니 추가에 실패했습니다." };
  }
}
