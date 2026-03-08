// ============================================================
// COSFIT - Partner Reviews Server Actions
// ============================================================

"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ── Auth Helper ──
async function getAuthenticatedPartner() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "PARTNER") {
    throw new Error("인증이 필요합니다.");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { partnerId: true },
  });
  if (!user?.partnerId) {
    throw new Error("파트너 정보를 찾을 수 없습니다.");
  }
  return user.partnerId;
}

// ── Types ──

export interface ReviewItem {
  id: string;
  productName: string;
  content: string;
  rating: number | null;
  sentiment: string | null;
  source: string;
  authorName: string | null;
  collectedAt: string; // ISO string
}

export interface ReviewStatsData {
  averageRating: number;
  totalReviews: number;
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  ratingDistribution: {
    rating: number;
    count: number;
  }[];
}

// ── Actions ──

export async function getProductReviews(
  productId?: string
): Promise<ReviewItem[]> {
  const partnerId = await getAuthenticatedPartner();

  // Get partner's product IDs
  const partnerProducts = await prisma.partnerProduct.findMany({
    where: { partnerId },
    select: { productId: true },
  });
  const productIds = partnerProducts.map((p) => p.productId);

  if (productIds.length === 0) return [];

  // Filter by specific product if provided, but verify ownership
  const whereProductIds = productId
    ? productIds.includes(productId)
      ? [productId]
      : []
    : productIds;

  if (whereProductIds.length === 0) return [];

  const reviews = await prisma.collectedReview.findMany({
    where: {
      productId: { in: whereProductIds },
    },
    include: {
      product: { select: { name: true } },
    },
    orderBy: { collectedAt: "desc" },
    take: 200,
  });

  return reviews.map((r) => ({
    id: r.id,
    productName: r.product.name,
    content: r.content,
    rating: r.rating,
    sentiment: r.sentiment,
    source: r.source,
    authorName: r.authorName,
    collectedAt: r.collectedAt.toISOString(),
  }));
}

export async function getReviewStats(): Promise<ReviewStatsData> {
  const partnerId = await getAuthenticatedPartner();

  // Get partner's product IDs
  const partnerProducts = await prisma.partnerProduct.findMany({
    where: { partnerId },
    select: { productId: true },
  });
  const productIds = partnerProducts.map((p) => p.productId);

  if (productIds.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 },
      ratingDistribution: [1, 2, 3, 4, 5].map((r) => ({
        rating: r,
        count: 0,
      })),
    };
  }

  const reviews = await prisma.collectedReview.findMany({
    where: {
      productId: { in: productIds },
    },
    select: { rating: true, sentiment: true },
  });

  const totalReviews = reviews.length;

  // Average rating (only reviews with ratings)
  const withRating = reviews.filter((r) => r.rating !== null);
  const averageRating =
    withRating.length > 0
      ? Math.round(
          (withRating.reduce((sum, r) => sum + (r.rating || 0), 0) /
            withRating.length) *
            10
        ) / 10
      : 0;

  // Sentiment breakdown
  const sentimentBreakdown = { positive: 0, negative: 0, neutral: 0 };
  reviews.forEach((r) => {
    const s = (r.sentiment || "").toUpperCase();
    if (s === "POSITIVE") sentimentBreakdown.positive++;
    else if (s === "NEGATIVE") sentimentBreakdown.negative++;
    else sentimentBreakdown.neutral++;
  });

  // Rating distribution (round ratings to nearest int)
  const ratingCounts = new Map<number, number>();
  for (let i = 1; i <= 5; i++) ratingCounts.set(i, 0);
  withRating.forEach((r) => {
    const rounded = Math.round(r.rating!);
    const clamped = Math.min(5, Math.max(1, rounded));
    ratingCounts.set(clamped, (ratingCounts.get(clamped) || 0) + 1);
  });

  const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: ratingCounts.get(rating) || 0,
  }));

  return {
    averageRating,
    totalReviews,
    sentimentBreakdown,
    ratingDistribution,
  };
}
