import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { successResponse, errorResponse, ERROR_CODES } from "@/lib/api/response";
import { compareRequestSchema } from "@/lib/validators/schemas";
import { runCompareAnalysis } from "@/app/(user)/compare/actions";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return errorResponse(ERROR_CODES.UNAUTHORIZED, "인증이 필요합니다.", 401);
    }

    const body = await request.json();
    const parsed = compareRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(ERROR_CODES.VALIDATION_ERROR, "입력값이 올바르지 않습니다.", 400);
    }

    const { productId } = parsed.data;
    const result = await runCompareAnalysis(productId);

    if (!result.success) {
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, result.error ?? "비교 분석 실패", 500);
    }

    return successResponse(result.data);
  } catch (error) {
    console.error("[Compare API]", error);
    return errorResponse(ERROR_CODES.INTERNAL_ERROR, "서버 오류가 발생했습니다.", 500);
  }
}
