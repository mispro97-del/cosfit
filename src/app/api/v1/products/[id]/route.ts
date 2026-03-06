// ============================================================
// COSFIT - Product Detail API
// GET /api/v1/products/:id
// ============================================================

import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { successResponse, errorResponse, ERROR_CODES } from "@/lib/api/response";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.productMaster.findUnique({
      where: { id: params.id },
      include: {
        brand: true,
        ingredients: {
          include: { ingredient: true },
          orderBy: { orderIndex: "asc" },
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
            aiSummary: true,
            createdAt: true,
          },
        },
      },
    });

    if (!product) {
      return errorResponse(ERROR_CODES.NOT_FOUND, "제품을 찾을 수 없습니다.", 404);
    }

    return successResponse({
      id: product.id,
      name: product.name,
      brand: (product as any).brand.name,
      brandId: product.brandId,
      category: product.category,
      subCategory: product.subCategory,
      description: product.description,
      imageUrl: product.imageUrl,
      price: product.price,
      volume: product.volume,
      status: product.status,
      ingredientCount: product.ingredientCount,
      ingredients: (product as any).ingredients.map((pi: any) => ({
        id: pi.ingredient.id,
        nameInci: pi.ingredient.nameInci,
        nameKo: pi.ingredient.nameKo,
        orderIndex: pi.orderIndex,
        safetyGrade: pi.ingredient.safetyGrade,
        ewgScore: pi.ingredient.ewgScore,
        commonAllergen: pi.ingredient.commonAllergen,
        category: pi.ingredient.category,
        functions: pi.ingredient.function,
        description: pi.ingredient.description,
      })),
      reviews: (product as any).reviews,
    });
  } catch (error) {
    console.error("[Product Detail API Error]", error);
    return errorResponse(ERROR_CODES.INTERNAL_ERROR, "제품 조회 중 오류가 발생했습니다.", 500);
  }
}
