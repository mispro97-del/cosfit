// ============================================================
// COSFIT - Products List API
// GET /api/v1/products
// ============================================================

import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { successResponse, errorResponse, paginationMeta, ERROR_CODES } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get("category") ?? undefined;
    const brandId = searchParams.get("brandId") ?? undefined;
    const status = searchParams.get("status") ?? "ACTIVE";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));

    const where: any = { status };
    if (category) where.category = category;
    if (brandId) where.brandId = brandId;

    const [items, total] = await Promise.all([
      prisma.productMaster.findMany({
        where,
        include: { brand: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.productMaster.count({ where }),
    ]);

    return successResponse(
      items.map((p: any) => ({
        id: p.id,
        name: p.name,
        brand: p.brand.name,
        brandId: p.brandId,
        category: p.category,
        price: p.price,
        imageUrl: p.imageUrl,
        ingredientCount: p.ingredientCount,
        status: p.status,
      })),
      paginationMeta(page, limit, total)
    );
  } catch (error) {
    console.error("[Products API Error]", error);
    return errorResponse(ERROR_CODES.INTERNAL_ERROR, "제품 목록 조회 중 오류가 발생했습니다.", 500);
  }
}
