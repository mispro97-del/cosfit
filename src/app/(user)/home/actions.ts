"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const SKIN_TYPE_LABEL: Record<string, string> = {
  DRY: "건성",
  OILY: "지성",
  COMBINATION: "복합성",
  SENSITIVE: "민감성",
  NORMAL: "중성",
};

export async function getDashboardData() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const userId = session.user.id;

  // Run all queries in parallel
  const [
    skinProfile,
    userStandard,
    morningProducts,
    eveningProducts,
    latestRoutineAnalysis,
    recommendations,
    featuredProducts,
    totalRegisteredProducts,
    analysisCount,
  ] = await Promise.all([
    // Skin profile
    prisma.skinProfile.findUnique({
      where: { userId },
    }),

    // User standard
    prisma.userStandard.findUnique({
      where: { userId },
      select: {
        confidenceScore: true,
        basedOnProductCount: true,
        preferredIngredients: true,
        avoidIngredients: true,
      },
    }),

    // Morning routine products count
    prisma.userProduct.count({
      where: {
        userId,
        isCurrentUse: true,
        routineType: { in: ["MORNING", "BOTH"] },
      },
    }),

    // Evening routine products count
    prisma.userProduct.count({
      where: {
        userId,
        isCurrentUse: true,
        routineType: { in: ["EVENING", "BOTH"] },
      },
    }),

    // Latest routine analysis
    prisma.routineAnalysis.findFirst({
      where: { userId },
      orderBy: { analyzedAt: "desc" },
      select: {
        routineType: true,
        overallScore: true,
        analyzedAt: true,
      },
    }),

    // Top 3 recommendations (not viewed)
    prisma.productRecommendation.findMany({
      where: { userId, isViewed: false },
      orderBy: { priority: "asc" },
      take: 3,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            category: true,
            brand: { select: { name: true, nameKo: true } },
          },
        },
      },
    }),

    // Featured partner products (promoted & active)
    prisma.partnerProduct.findMany({
      where: {
        isPromoted: true,
        partner: { status: "APPROVED" },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            category: true,
            brand: { select: { name: true, nameKo: true } },
          },
        },
        variants: {
          where: { isActive: true },
          orderBy: { price: "asc" },
          take: 1,
          select: { price: true, originalPrice: true },
        },
        images: {
          where: { isMain: true },
          take: 1,
          select: { imageUrl: true },
        },
      },
    }),

    // Total registered products
    prisma.userProduct.count({ where: { userId } }),

    // Analysis count
    prisma.compareResult.count({ where: { userId } }),
  ]);

  return {
    userName: session.user.name || "Guest",
    onboardingDone:
      session.user.onboardingStatus &&
      session.user.onboardingStatus !== "PENDING",
    skinProfile: skinProfile
      ? {
          skinType: skinProfile.skinType,
          skinTypeLabel: SKIN_TYPE_LABEL[skinProfile.skinType] || skinProfile.skinType,
          skinConcerns: skinProfile.skinConcerns,
          sensitivityLevel: skinProfile.sensitivityLevel,
          allergies: skinProfile.allergies,
        }
      : null,
    userStandard: userStandard
      ? {
          confidenceScore: userStandard.confidenceScore,
          basedOnProductCount: userStandard.basedOnProductCount,
        }
      : null,
    routine: {
      morningCount: morningProducts,
      eveningCount: eveningProducts,
      latestAnalysis: latestRoutineAnalysis
        ? {
            routineType: latestRoutineAnalysis.routineType,
            score: latestRoutineAnalysis.overallScore,
            analyzedAt: latestRoutineAnalysis.analyzedAt.toISOString(),
          }
        : null,
    },
    recommendations: recommendations.map((r) => ({
      id: r.id,
      fitScore: r.fitScore,
      reason: r.reason,
      product: {
        id: r.product.id,
        name: r.product.name,
        imageUrl: r.product.imageUrl,
        category: r.product.category,
        brandName: r.product.brand.nameKo || r.product.brand.name,
      },
    })),
    featuredProducts: featuredProducts.map((pp) => ({
      partnerProductId: pp.id,
      productId: pp.product.id,
      name: pp.product.name,
      brandName: pp.product.brand.nameKo || pp.product.brand.name,
      imageUrl: pp.images[0]?.imageUrl || pp.product.imageUrl,
      category: pp.product.category,
      price: pp.variants[0]?.price ?? null,
      originalPrice: pp.variants[0]?.originalPrice ?? null,
    })),
    stats: {
      totalProducts: totalRegisteredProducts,
      analysisCount,
    },
  };
}
