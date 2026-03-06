import { NextRequest } from "next/server";
import { successResponse, errorResponse, ERROR_CODES } from "@/lib/api/response";
import { compareRequestSchema } from "@/lib/validators/schemas";
import { calculateFitScore } from "@/lib/ai/analysis";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = compareRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(ERROR_CODES.VALIDATION_ERROR, "입력값이 올바르지 않습니다.", 400);
    }

    const userId = request.headers.get("x-user-id");
    if (!userId) return errorResponse(ERROR_CODES.UNAUTHORIZED, "인증이 필요합니다.", 401);

    // TODO: DB에서 UserStandard + 제품 성분 조회
    const mockStandard = { preferredIngredients: [], avoidIngredients: [], ingredientPatterns: [] };
    const result = await calculateFitScore(mockStandard, []);

    return successResponse(result);
  } catch (error) {
    console.error("[Compare API]", error);
    return errorResponse(ERROR_CODES.INTERNAL_ERROR, "서버 오류가 발생했습니다.", 500);
  }
}
