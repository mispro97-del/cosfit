// ============================================================
// COSFIT - Compare History API
// GET /api/v1/compare/history?page=1&limit=10
// ============================================================

import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { successResponse, errorResponse, paginationMeta, ERROR_CODES } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) return errorResponse(ERROR_CODES.UNAUTHORIZED, "인증이 필요합니다.", 401);
    const userId = token.id as string;

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(20, Math.max(1, Number(searchParams.get("limit") ?? 10)));

    const [items, total] = await Promise.all([
      prisma.compareResult.findMany({
        where: { userId },
        include: {
          product: { include: { brand: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.compareResult.count({ where: { userId } }),
    ]);

    return successResponse(
      (items as any[]).map((r) => ({
        id: r.id,
        productId: r.productId,
        productName: r.product.name,
        productBrand: r.product.brand.name,
        productImage: r.product.imageUrl,
        fitScore: r.fitScore,
        fitGrade: r.fitGrade,
        summary: r.summary,
        analysisModel: r.analysisModel,
        createdAt: r.createdAt.toISOString(),
      })),
      paginationMeta(page, limit, total)
    );
  } catch (error) {
    console.error("[Compare History API Error]", error);
    return errorResponse(ERROR_CODES.INTERNAL_ERROR, "히스토리 조회 중 오류가 발생했습니다.", 500);
  }
}
