// ============================================================
// COSFIT - Review Submit API
// POST /api/v1/reviews
// ============================================================

import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { successResponse, errorResponse, ERROR_CODES } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return errorResponse(ERROR_CODES.UNAUTHORIZED, "로그인이 필요합니다.", 401);
    }
    const userId = token.id as string;

    const body = await request.json().catch(() => null);
    if (!body) return errorResponse(ERROR_CODES.VALIDATION_ERROR, "요청 본문이 올바르지 않습니다.", 400);

    const { productId, rating, content, pros, cons, skinTypeAtReview } = body;

    // 필수값 검증
    if (!productId || typeof productId !== "string") {
      return errorResponse(ERROR_CODES.VALIDATION_ERROR, "productId는 필수입니다.", 400);
    }
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return errorResponse(ERROR_CODES.VALIDATION_ERROR, "rating은 1~5 사이의 숫자여야 합니다.", 400);
    }
    if (!content || typeof content !== "string" || content.trim().length < 10) {
      return errorResponse(ERROR_CODES.VALIDATION_ERROR, "리뷰 내용은 최소 10자 이상이어야 합니다.", 400);
    }

    // 제품 존재 확인
    const product = await prisma.productMaster.findUnique({ where: { id: productId } });
    if (!product) {
      return errorResponse(ERROR_CODES.NOT_FOUND, "제품을 찾을 수 없습니다.", 404);
    }

    // 중복 리뷰 확인 (같은 유저가 같은 제품에 PENDING/AI_SUMMARIZED/APPROVED 리뷰가 이미 있으면 거부)
    const existing = await prisma.review.findFirst({
      where: { userId, productId, status: { in: ["PENDING", "AI_SUMMARIZED", "APPROVED"] } },
    });
    if (existing) {
      return errorResponse(ERROR_CODES.VALIDATION_ERROR, "이미 이 제품에 리뷰를 작성하셨습니다.", 400);
    }

    const review = await prisma.review.create({
      data: {
        userId,
        productId,
        rating: Math.round(rating),
        content: content.trim(),
        pros: Array.isArray(pros) ? pros.filter((p: any) => typeof p === "string") : [],
        cons: Array.isArray(cons) ? cons.filter((c: any) => typeof c === "string") : [],
        skinTypeAtReview: skinTypeAtReview ?? null,
        status: "PENDING",
      },
    }) as any;

    return successResponse(
      { id: review.id, status: review.status, createdAt: review.createdAt },
      undefined,
      201
    );
  } catch (error) {
    console.error("[Reviews API Error]", error);
    return errorResponse(ERROR_CODES.INTERNAL_ERROR, "리뷰 저장 중 오류가 발생했습니다.", 500);
  }
}
