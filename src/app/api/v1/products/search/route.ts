// ============================================================
// COSFIT - Product Search API
// GET /api/v1/products/search?q=세럼&category=SERUM&page=1
// ============================================================

import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { successResponse, errorResponse, paginationMeta, ERROR_CODES } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q")?.trim() ?? "";
    const category = searchParams.get("category") ?? undefined;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));

    const where: any = {
      status: { in: ["ACTIVE", "SUCCESS"] },
    };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    if (category) where.category = category;

    const [items, total] = await Promise.all([
      prisma.productMaster.findMany({
        where,
        include: { brand: true },
        orderBy: [{ ingredientCount: "desc" }, { name: "asc" }],
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
    console.error("[Product Search API Error]", error);
    return errorResponse(ERROR_CODES.INTERNAL_ERROR, "검색 중 오류가 발생했습니다.", 500);
  }
}
