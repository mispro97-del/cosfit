// ============================================================
// COSFIT - AI Image Recognition API (Claude Vision)
// POST /api/v1/products/recognize
// ============================================================

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import claude from "@/lib/claude";
import { successResponse, errorResponse, ERROR_CODES } from "@/lib/api/response";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return errorResponse(ERROR_CODES.UNAUTHORIZED, "로그인이 필요합니다.", 401);
    }

    const body = await request.json();
    const { imageBase64 } = body;

    // base64 유효성 검증
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "이미지를 업로드해주세요.",
        400
      );
    }

    // base64 형식 검증
    if (!/^[A-Za-z0-9+/]+=*$/.test(imageBase64.slice(0, 100))) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "유효한 이미지 형식이 아닙니다.",
        400
      );
    }

    // 이미지 크기 제한 (base64는 원본 대비 ~33% 크기 증가)
    const estimatedSize = Math.ceil((imageBase64.length * 3) / 4);
    if (estimatedSize > MAX_IMAGE_SIZE_BYTES) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "이미지 크기가 5MB를 초과합니다.",
        400
      );
    }

    // Claude Vision API로 제품 인식
    const response = await claude.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: '이 화장품 이미지에서 제품명과 브랜드명을 추출해주세요. 반드시 아래 JSON 형식으로만 응답해주세요. 다른 텍스트 없이 JSON만 출력하세요:\n{"name": "제품명", "brand": "브랜드명"}\n\n제품을 인식할 수 없으면:\n{"name": null, "brand": null}',
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: imageBase64,
              },
            },
          ],
        },
      ],
    });

    const content =
      response.content[0]?.type === "text"
        ? response.content[0].text.trim()
        : "";

    // JSON 파싱 (코드블록 제거)
    let recognized: { name: string | null; brand: string | null };
    try {
      const jsonStr = content.replace(/```json\s*|```\s*/g, "").trim();
      recognized = JSON.parse(jsonStr);
    } catch {
      console.error("[AI Recognition] Failed to parse response:", content);
      return errorResponse(
        ERROR_CODES.AI_PROCESSING_ERROR,
        "AI가 이미지를 인식하지 못했습니다. 다른 이미지를 시도해주세요.",
        422
      );
    }

    if (!recognized.name && !recognized.brand) {
      return successResponse({
        recognized: { name: null, brand: null },
        matches: [],
      });
    }

    // 인식된 정보로 ProductMaster에서 유사 제품 검색
    const orConditions: any[] = [];

    if (recognized.name) {
      orConditions.push({
        name: { contains: recognized.name, mode: "insensitive" },
      });
    }
    if (recognized.brand) {
      orConditions.push({
        brand: { name: { contains: recognized.brand, mode: "insensitive" } },
      });
      orConditions.push({
        brand: { nameKo: { contains: recognized.brand, mode: "insensitive" } },
      });
    }

    const matchedProducts =
      orConditions.length > 0
        ? await prisma.productMaster.findMany({
            where: {
              status: "ACTIVE",
              OR: orConditions,
            },
            include: { brand: true },
            take: 10,
            orderBy: { name: "asc" },
          })
        : [];

    return successResponse({
      recognized: {
        name: recognized.name,
        brand: recognized.brand,
      },
      matches: matchedProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        brand: p.brand.nameKo ?? p.brand.name,
        brandId: p.brandId,
        category: p.category,
        imageUrl: p.imageUrl,
      })),
    });
  } catch (error: any) {
    // Claude API 에러 구분
    if (error?.status === 429) {
      return errorResponse(
        ERROR_CODES.RATE_LIMIT,
        "AI 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
        429
      );
    }

    console.error("[AI Recognition API Error]", error);
    return errorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "이미지 인식 중 오류가 발생했습니다.",
      500
    );
  }
}
