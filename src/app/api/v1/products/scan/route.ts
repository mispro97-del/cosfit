// ============================================================
// COSFIT - Barcode Scan API
// POST /api/v1/products/scan
// ============================================================

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { successResponse, errorResponse, ERROR_CODES } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return errorResponse(ERROR_CODES.UNAUTHORIZED, "로그인이 필요합니다.", 401);
    }

    const body = await request.json();
    const { barcode } = body;

    // 바코드 유효성 검증
    if (!barcode || typeof barcode !== "string" || barcode.trim().length === 0) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "바코드 번호를 입력해주세요.",
        400
      );
    }

    const trimmed = barcode.trim();

    // 바코드 형식 검증 (숫자만, 8~14자리)
    if (!/^\d{8,14}$/.test(trimmed)) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "유효한 바코드 형식이 아닙니다. (8~14자리 숫자)",
        400
      );
    }

    // ProductMaster에서 바코드로 검색
    const product = await prisma.productMaster.findUnique({
      where: { barcode: trimmed },
      include: { brand: true },
    });

    if (!product) {
      return successResponse({ found: false });
    }

    return successResponse({
      found: true,
      product: {
        id: product.id,
        name: product.name,
        brand: product.brand.nameKo ?? product.brand.name,
        brandId: product.brandId,
        category: product.category,
        imageUrl: product.imageUrl,
      },
    });
  } catch (error) {
    console.error("[Barcode Scan API Error]", error);
    return errorResponse(ERROR_CODES.INTERNAL_ERROR, "바코드 스캔 중 오류가 발생했습니다.", 500);
  }
}
