// ============================================================
// COSFIT - Admin Review Collection & Sentiment Analysis Actions
// ============================================================

"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";

const openai = new OpenAI();

// ── Auth Guard ──

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("관리자 권한이 필요합니다.");
  }
  return session.user;
}

// ── Types ──

export interface CollectedReviewItem {
  id: string;
  productId: string;
  productName: string;
  brandName: string;
  source: string;
  content: string;
  rating: number | null;
  sentiment: string | null;
  skinType: string | null;
  keywords: string[] | null;
  authorName: string | null;
  collectedAt: string;
}

export interface ReviewStats {
  totalCount: number;
  bySource: { source: string; count: number }[];
  bySentiment: { sentiment: string; count: number }[];
  analyzedCount: number;
  unanalyzedCount: number;
}

export interface PaginatedReviews {
  reviews: CollectedReviewItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Actions ──

/**
 * 수집된 리뷰 목록 (페이지네이션, 필터)
 */
export async function getCollectedReviews(
  page: number = 1,
  source?: string,
  productId?: string,
  sentiment?: string
): Promise<PaginatedReviews> {
  await requireAdmin();

  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (source) where.source = source;
  if (productId) where.productId = productId;
  if (sentiment) where.sentiment = sentiment;

  const [reviews, total] = await Promise.all([
    prisma.collectedReview.findMany({
      where,
      include: {
        product: {
          select: { name: true, brand: { select: { name: true } } },
        },
      },
      orderBy: { collectedAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.collectedReview.count({ where }),
  ]);

  return {
    reviews: reviews.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.product.name,
      brandName: r.product.brand.name,
      source: r.source,
      content: r.content,
      rating: r.rating,
      sentiment: r.sentiment,
      skinType: r.skinType,
      keywords: r.keywords as string[] | null,
      authorName: r.authorName,
      collectedAt: r.collectedAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 특정 제품에 대한 샘플 리뷰 생성 (OpenAI)
 */
export async function collectReviewsForProduct(productId: string) {
  await requireAdmin();

  const product = await prisma.productMaster.findUnique({
    where: { id: productId },
    include: { brand: { select: { name: true } } },
  });

  if (!product) {
    throw new Error("제품을 찾을 수 없습니다.");
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `다음 화장품에 대한 현실적인 한국어 리뷰 5개를 JSON으로 생성해주세요.
제품: ${product.name} (${product.brand.name}, ${product.category})
형식: {"reviews": [{"content": "리뷰 내용 (2-4문장)", "rating": 1-5, "skinType": "DRY|OILY|COMBINATION|SENSITIVE|NORMAL", "authorName": "닉네임"}]}
다양한 평점과 피부타입을 포함해주세요. 긍정/부정/중립 리뷰를 골고루 섞어주세요.`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const parsed = JSON.parse(response.choices[0].message.content || "{}");
  const generatedReviews = parsed.reviews || [];

  const created = await prisma.$transaction(
    generatedReviews.map((review: any) =>
      prisma.collectedReview.create({
        data: {
          productId,
          source: "SAMPLE",
          content: review.content,
          rating: typeof review.rating === "number" ? review.rating : null,
          skinType: review.skinType || null,
          authorName: review.authorName || null,
        },
      })
    )
  );

  revalidatePath("/admin/reviews");

  return { count: created.length };
}

/**
 * 단건 리뷰 감성 분석
 */
export async function analyzeReviewSentiment(reviewId: string) {
  await requireAdmin();

  const review = await prisma.collectedReview.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new Error("리뷰를 찾을 수 없습니다.");
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `다음 화장품 리뷰의 감성을 분석해주세요. JSON으로 응답:
{"sentiment": "POSITIVE|NEGATIVE|NEUTRAL", "keywords": ["키워드1", "키워드2", "키워드3"]}
sentiment는 반드시 POSITIVE, NEGATIVE, NEUTRAL 중 하나여야 합니다.
keywords는 리뷰에서 핵심 키워드 2-5개를 추출해주세요.

리뷰: ${review.content}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const parsed = JSON.parse(response.choices[0].message.content || "{}");

  const validSentiments = ["POSITIVE", "NEGATIVE", "NEUTRAL"];
  const sentiment = validSentiments.includes(parsed.sentiment)
    ? parsed.sentiment
    : "NEUTRAL";
  const keywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];

  const updated = await prisma.collectedReview.update({
    where: { id: reviewId },
    data: { sentiment, keywords },
  });

  revalidatePath("/admin/reviews");

  return {
    id: updated.id,
    sentiment: updated.sentiment,
    keywords: updated.keywords,
  };
}

/**
 * 다건 감성 분석
 */
export async function bulkAnalyzeSentiment(reviewIds: string[]) {
  await requireAdmin();

  if (reviewIds.length === 0) {
    throw new Error("분석할 리뷰를 선택해주세요.");
  }

  if (reviewIds.length > 50) {
    throw new Error("한 번에 최대 50개까지 분석할 수 있습니다.");
  }

  const results: { id: string; sentiment: string | null; error?: string }[] = [];

  for (const reviewId of reviewIds) {
    try {
      const result = await analyzeReviewSentiment(reviewId);
      results.push({ id: result.id, sentiment: result.sentiment });
    } catch (err: any) {
      results.push({ id: reviewId, sentiment: null, error: err.message });
    }
  }

  revalidatePath("/admin/reviews");

  return {
    total: reviewIds.length,
    success: results.filter((r) => r.sentiment !== null).length,
    failed: results.filter((r) => r.sentiment === null).length,
    results,
  };
}

/**
 * 리뷰 통계
 */
export async function getReviewStats(): Promise<ReviewStats> {
  await requireAdmin();

  const [totalCount, bySource, bySentiment, analyzedCount] = await Promise.all([
    prisma.collectedReview.count(),

    prisma.collectedReview.groupBy({
      by: ["source"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),

    prisma.collectedReview.groupBy({
      by: ["sentiment"],
      _count: { id: true },
      where: { sentiment: { not: null } },
    }),

    prisma.collectedReview.count({
      where: { sentiment: { not: null } },
    }),
  ]);

  return {
    totalCount,
    bySource: bySource.map((s) => ({
      source: s.source,
      count: s._count.id,
    })),
    bySentiment: bySentiment.map((s) => ({
      sentiment: s.sentiment || "UNKNOWN",
      count: s._count.id,
    })),
    analyzedCount,
    unanalyzedCount: totalCount - analyzedCount,
  };
}

/**
 * 제품 검색 (리뷰 수집용)
 */
export async function searchProducts(query: string) {
  await requireAdmin();

  if (!query || query.length < 1) return [];

  const products = await prisma.productMaster.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { brand: { name: { contains: query, mode: "insensitive" } } },
        { brand: { nameKo: { contains: query, mode: "insensitive" } } },
      ],
    },
    include: {
      brand: { select: { name: true } },
    },
    take: 10,
    orderBy: { name: "asc" },
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    brandName: p.brand.name,
    category: p.category,
  }));
}
