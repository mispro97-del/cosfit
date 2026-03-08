// ============================================================
// COSFIT - ETL Pipeline Core Logic
// 성분 데이터 보강, 리뷰 감성 분석, 제품 품질 점검
// ============================================================

import prisma from "@/lib/prisma";

// ── Types ──

export interface ETLStepResult {
  type: "ingredients" | "reviews" | "products";
  processed: number;
  updated: number;
  errors: number;
  details?: Record<string, unknown>;
  durationMs: number;
}

export interface FullETLReport {
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  steps: ETLStepResult[];
  summary: {
    totalProcessed: number;
    totalUpdated: number;
    totalErrors: number;
  };
}

// ── Ingredient ETL ──

export async function runIngredientETL(): Promise<ETLStepResult> {
  const start = Date.now();
  let processed = 0;
  let updated = 0;
  let errors = 0;

  try {
    // 안전등급이 UNKNOWN이거나 description이 없는 성분 조회
    const incompleteIngredients = await prisma.ingredient.findMany({
      where: {
        OR: [
          { safetyGrade: "UNKNOWN" },
          { description: null },
          { nameKo: null },
        ],
      },
      select: {
        id: true,
        nameInci: true,
        safetyGrade: true,
        description: true,
        nameKo: true,
      },
    });

    processed = incompleteIngredients.length;

    // 통계 집계
    const missingSafetyGrade = incompleteIngredients.filter(
      (i) => i.safetyGrade === "UNKNOWN"
    ).length;
    const missingDescription = incompleteIngredients.filter(
      (i) => !i.description
    ).length;
    const missingNameKo = incompleteIngredients.filter(
      (i) => !i.nameKo
    ).length;

    // DataQualityLog에 기록
    const totalIngredients = await prisma.ingredient.count();
    const missingRate =
      totalIngredients > 0 ? processed / totalIngredients : 0;

    await prisma.dataQualityLog.create({
      data: {
        entityType: "INGREDIENT",
        totalCount: totalIngredients,
        missingRate,
        details: {
          missingSafetyGrade,
          missingDescription,
          missingNameKo,
          etlType: "ingredient",
          timestamp: new Date().toISOString(),
        },
      },
    });

    updated = 1; // log entry created
  } catch (err) {
    errors++;
    console.error("[ETL] Ingredient ETL error:", err);
  }

  return {
    type: "ingredients",
    processed,
    updated,
    errors,
    details: {
      message: `${processed}개 성분 데이터 품질 점검 완료`,
    },
    durationMs: Date.now() - start,
  };
}

// ── Review ETL ──

export async function runReviewETL(): Promise<ETLStepResult> {
  const start = Date.now();
  let processed = 0;
  let updated = 0;
  let errors = 0;

  try {
    // 감성 분석이 안 된 CollectedReview 조회 (배치 10개)
    const unanalyzedReviews = await prisma.collectedReview.findMany({
      where: { sentiment: null },
      select: {
        id: true,
        content: true,
        productId: true,
      },
      take: 10,
      orderBy: { collectedAt: "asc" },
    });

    processed = unanalyzedReviews.length;

    // 간단한 키워드 기반 감성 분석 (OpenAI 없이 로컬 처리)
    const positiveKeywords = [
      "좋아",
      "최고",
      "만족",
      "추천",
      "촉촉",
      "효과",
      "순해",
      "괜찮",
      "좋은",
      "사랑",
      "대박",
      "굿",
      "최애",
      "인생템",
    ];
    const negativeKeywords = [
      "별로",
      "실망",
      "안좋",
      "따가",
      "트러블",
      "자극",
      "비싸",
      "끈적",
      "냄새",
      "안맞",
      "후회",
      "최악",
    ];

    for (const review of unanalyzedReviews) {
      try {
        const content = review.content.toLowerCase();
        let posScore = 0;
        let negScore = 0;

        for (const kw of positiveKeywords) {
          if (content.includes(kw)) posScore++;
        }
        for (const kw of negativeKeywords) {
          if (content.includes(kw)) negScore++;
        }

        let sentiment: string;
        if (posScore > negScore) sentiment = "POSITIVE";
        else if (negScore > posScore) sentiment = "NEGATIVE";
        else sentiment = "NEUTRAL";

        // 키워드 추출 (매칭된 키워드 목록)
        const matchedKeywords = [
          ...positiveKeywords.filter((kw) => content.includes(kw)),
          ...negativeKeywords.filter((kw) => content.includes(kw)),
        ].slice(0, 5);

        await prisma.collectedReview.update({
          where: { id: review.id },
          data: {
            sentiment,
            keywords: matchedKeywords.length > 0 ? matchedKeywords : undefined,
          },
        });

        updated++;
      } catch (err) {
        errors++;
        console.error(
          `[ETL] Review ${review.id} analysis error:`,
          err
        );
      }
    }

    // 전체 통계 기록
    const totalReviews = await prisma.collectedReview.count();
    const analyzedCount = await prisma.collectedReview.count({
      where: { sentiment: { not: null } },
    });
    const missingRate =
      totalReviews > 0 ? (totalReviews - analyzedCount) / totalReviews : 0;

    await prisma.dataQualityLog.create({
      data: {
        entityType: "REVIEW",
        totalCount: totalReviews,
        missingRate,
        details: {
          analyzedCount,
          unanalyzedCount: totalReviews - analyzedCount,
          batchProcessed: processed,
          batchUpdated: updated,
          etlType: "review",
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    errors++;
    console.error("[ETL] Review ETL error:", err);
  }

  return {
    type: "reviews",
    processed,
    updated,
    errors,
    details: {
      message: `${updated}/${processed}개 리뷰 감성 분석 완료`,
    },
    durationMs: Date.now() - start,
  };
}

// ── Product Quality ETL ──

export async function runProductQualityETL(): Promise<ETLStepResult> {
  const start = Date.now();
  let processed = 0;
  let updated = 0;
  let errors = 0;

  try {
    // 브랜드, 카테고리, 또는 성분이 누락된 제품 조회
    const incompleteProducts = await prisma.productMaster.findMany({
      where: {
        OR: [
          { ingredientCount: 0 },
          { description: null },
          { imageUrl: null },
          { dataStatus: { in: ["NONE", "FAILED", "QUALITY_ISSUE"] } },
        ],
      },
      select: {
        id: true,
        name: true,
        brandId: true,
        category: true,
        ingredientCount: true,
        description: true,
        imageUrl: true,
        dataStatus: true,
      },
    });

    processed = incompleteProducts.length;

    // 항목별 누락 집계
    const missingIngredients = incompleteProducts.filter(
      (p) => p.ingredientCount === 0
    ).length;
    const missingDescription = incompleteProducts.filter(
      (p) => !p.description
    ).length;
    const missingImage = incompleteProducts.filter(
      (p) => !p.imageUrl
    ).length;
    const dataStatusIssues = incompleteProducts.filter((p) =>
      ["NONE", "FAILED", "QUALITY_ISSUE"].includes(p.dataStatus)
    ).length;

    // DataQualityLog에 기록
    const totalProducts = await prisma.productMaster.count();
    const missingRate =
      totalProducts > 0 ? processed / totalProducts : 0;

    await prisma.dataQualityLog.create({
      data: {
        entityType: "PRODUCT",
        totalCount: totalProducts,
        missingRate,
        details: {
          incompleteCount: processed,
          missingIngredients,
          missingDescription,
          missingImage,
          dataStatusIssues,
          etlType: "product",
          timestamp: new Date().toISOString(),
        },
      },
    });

    updated = 1; // log entry created
  } catch (err) {
    errors++;
    console.error("[ETL] Product Quality ETL error:", err);
  }

  return {
    type: "products",
    processed,
    updated,
    errors,
    details: {
      message: `${processed}개 제품 데이터 품질 점검 완료`,
    },
    durationMs: Date.now() - start,
  };
}

// ── Full ETL ──

export async function runFullETL(): Promise<FullETLReport> {
  const startedAt = new Date();
  const steps: ETLStepResult[] = [];

  // 순차 실행
  steps.push(await runIngredientETL());
  steps.push(await runReviewETL());
  steps.push(await runProductQualityETL());

  const completedAt = new Date();
  const totalDurationMs = completedAt.getTime() - startedAt.getTime();

  return {
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    totalDurationMs,
    steps,
    summary: {
      totalProcessed: steps.reduce((sum, s) => sum + s.processed, 0),
      totalUpdated: steps.reduce((sum, s) => sum + s.updated, 0),
      totalErrors: steps.reduce((sum, s) => sum + s.errors, 0),
    },
  };
}
