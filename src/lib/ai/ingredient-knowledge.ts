// ============================================================
// COSFIT - Ingredient Knowledge Enrichment (Claude API)
// AI 기반 성분 지식 DB 구축
// ============================================================

import claude from "@/lib/claude";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ── Types ──

export interface IngredientKnowledge {
  description: string;
  safetyInfo: string;
  commonUses: string[];
  knownInteractions: string[];
  skinTypeRecommendations: {
    skinType: string;
    recommendation: string;
  }[];
  scientificEvidence: string;
  enrichedAt: string;
}

// ── Enrich single ingredient ──

export async function enrichIngredientKnowledge(ingredient: {
  id: string;
  nameInci: string;
  nameKo?: string | null;
  nameEn?: string | null;
}): Promise<IngredientKnowledge> {
  const nameDisplay = ingredient.nameKo || ingredient.nameEn || ingredient.nameInci;

  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `화장품 성분 "${nameDisplay}" (INCI: ${ingredient.nameInci})에 대해 다음 JSON 형식으로 상세 정보를 제공해주세요.
반드시 유효한 JSON만 출력하세요. 다른 텍스트 없이 JSON만 응답하세요.

{
  "description": "성분에 대한 상세 설명 (한국어, 2-3문장)",
  "safetyInfo": "안전성 정보 (EWG 등급, 알레르기 가능성 등, 한국어 1-2문장)",
  "commonUses": ["화장품에서의 일반적 용도 1", "용도 2", "용도 3"],
  "knownInteractions": ["다른 성분과의 알려진 상호작용 1", "상호작용 2"],
  "skinTypeRecommendations": [
    {"skinType": "DRY", "recommendation": "건성 피부에 대한 추천/주의사항"},
    {"skinType": "OILY", "recommendation": "지성 피부에 대한 추천/주의사항"},
    {"skinType": "SENSITIVE", "recommendation": "민감성 피부에 대한 추천/주의사항"}
  ],
  "scientificEvidence": "이 성분의 효능에 대한 과학적 근거 요약 (한국어, 1-2문장)"
}`,
      },
    ],
  });

  const raw =
    response.content[0]?.type === "text" ? response.content[0].text : "{}";
  const jsonStr = raw.replace(/```json\s*|```\s*/g, "").trim();
  const parsed = JSON.parse(jsonStr);

  const knowledge: IngredientKnowledge = {
    description: parsed.description ?? "",
    safetyInfo: parsed.safetyInfo ?? "",
    commonUses: Array.isArray(parsed.commonUses) ? parsed.commonUses : [],
    knownInteractions: Array.isArray(parsed.knownInteractions)
      ? parsed.knownInteractions
      : [],
    skinTypeRecommendations: Array.isArray(parsed.skinTypeRecommendations)
      ? parsed.skinTypeRecommendations
      : [],
    scientificEvidence: parsed.scientificEvidence ?? "",
    enrichedAt: new Date().toISOString(),
  };

  // Save to DB
  await prisma.ingredient.update({
    where: { id: ingredient.id },
    data: {
      description: knowledge.description || undefined,
      knowledgeData: knowledge as any,
      knowledgeUpdatedAt: new Date(),
    },
  });

  return knowledge;
}

// ── Batch enrich ingredients ──

export async function batchEnrichIngredients(
  limit: number = 10
): Promise<{
  processed: number;
  enriched: number;
  errors: number;
  errorDetails: string[];
}> {
  // Find ingredients lacking knowledge data
  const ingredients = await prisma.ingredient.findMany({
    where: {
      OR: [
        { knowledgeData: { equals: Prisma.DbNull } },
        { description: null },
      ],
    },
    select: {
      id: true,
      nameInci: true,
      nameKo: true,
      nameEn: true,
    },
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  let enriched = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  for (const ingredient of ingredients) {
    try {
      await enrichIngredientKnowledge(ingredient);
      enriched++;
    } catch (err: any) {
      errors++;
      errorDetails.push(`[${ingredient.nameInci}] ${err.message}`);
      console.error(
        `[Ingredient Knowledge] Failed to enrich ${ingredient.nameInci}:`,
        err.message
      );
    }

    // Rate limiting: wait 1 second between API calls
    if (enriched + errors < ingredients.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Update batch job record
  try {
    await prisma.batchJob.upsert({
      where: { id: "ingredient-knowledge-job" },
      update: {
        lastRunAt: new Date(),
        lastResult: {
          processed: ingredients.length,
          enriched,
          errors,
          timestamp: new Date().toISOString(),
        },
      },
      create: {
        id: "ingredient-knowledge-job",
        type: "INGREDIENT_KNOWLEDGE",
        enabled: false,
        lastRunAt: new Date(),
        lastResult: {
          processed: ingredients.length,
          enriched,
          errors,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch {
    // Non-critical
  }

  return {
    processed: ingredients.length,
    enriched,
    errors,
    errorDetails,
  };
}
