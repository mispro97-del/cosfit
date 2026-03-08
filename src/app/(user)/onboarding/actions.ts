// ============================================================
// COSFIT - Server Actions: 온보딩 데이터 저장
// app/(user)/onboarding/actions.ts
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateUserStandard } from "@/lib/analysis";

// ────────────────────────────────────────────────────────────
// Types (Server Action I/O)
// ────────────────────────────────────────────────────────────

interface SkinProfileInput {
  skinType: "DRY" | "OILY" | "COMBINATION" | "SENSITIVE" | "NORMAL";
  skinConcerns: string[];
  sensitivityLevel: number;
  allergies?: string[];
}

interface HolyGrailProductInput {
  productId?: string;
  customName?: string;
  customBrand?: string;
  category: string;
  satisfactionScore?: number;
}

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Auth Helper ──
async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

// ────────────────────────────────────────────────────────────
// Action 1: 피부 프로필 저장 (S1-1 ~ S1-3)
// ────────────────────────────────────────────────────────────

export async function saveSkinProfile(
  input: SkinProfileInput
): Promise<ActionResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };

  try {
    if (!input.skinType) {
      return { success: false, error: "피부 타입을 선택해주세요." };
    }
    if (!input.skinConcerns || input.skinConcerns.length === 0) {
      return { success: false, error: "최소 1개의 피부 고민을 선택해주세요." };
    }
    if (!input.sensitivityLevel || input.sensitivityLevel < 1 || input.sensitivityLevel > 5) {
      return { success: false, error: "민감도를 선택해주세요." };
    }

    await prisma.skinProfile.upsert({
      where: { userId },
      update: {
        skinType: input.skinType,
        skinConcerns: input.skinConcerns,
        sensitivityLevel: input.sensitivityLevel,
        allergies: input.allergies ?? [],
      },
      create: {
        userId,
        skinType: input.skinType,
        skinConcerns: input.skinConcerns,
        sensitivityLevel: input.sensitivityLevel,
        allergies: input.allergies ?? [],
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { onboardingStatus: "SKIN_PROFILED" },
    });

    revalidatePath("/(user)/onboarding");
    return { success: true };
  } catch (error) {
    console.error("[saveSkinProfile Error]", error);
    return { success: false, error: "피부 프로필 저장 중 오류가 발생했습니다." };
  }
}

// ────────────────────────────────────────────────────────────
// Action 2: 인생템 등록 (S2-2 ~ S2-5)
// ────────────────────────────────────────────────────────────

export async function registerHolyGrailProduct(
  product: HolyGrailProductInput
): Promise<ActionResult<{ productId: string; totalRegistered: number }>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };

  try {
    if (!product.productId && !product.customName) {
      return { success: false, error: "제품을 선택하거나 이름을 입력해주세요." };
    }

    const existing = await prisma.holyGrailProduct.findFirst({
      where: {
        userId,
        OR: [
          { productId: product.productId },
          { customName: product.customName },
        ],
      },
    });

    if (existing) {
      return { success: false, error: "이미 등록된 제품입니다." };
    }

    const count = await prisma.holyGrailProduct.count({ where: { userId } });
    if (count >= 5) {
      return { success: false, error: "인생템은 최대 5개까지 등록할 수 있어요." };
    }

    const created = await prisma.holyGrailProduct.create({
      data: {
        userId,
        productId: product.productId,
        customName: product.customName,
        customBrand: product.customBrand,
        category: product.category as any,
        satisfactionScore: product.satisfactionScore ?? 5,
      },
    });

    const totalRegistered = count + 1;

    await prisma.user.update({
      where: { id: userId },
      data: { onboardingStatus: "PRODUCTS_ADDED" },
    });

    revalidatePath("/(user)/onboarding");
    return {
      success: true,
      data: {
        productId: created.id,
        totalRegistered,
      },
    };
  } catch (error) {
    console.error("[registerHolyGrailProduct Error]", error);
    return { success: false, error: "인생템 등록 중 오류가 발생했습니다." };
  }
}

// ────────────────────────────────────────────────────────────
// Action 3: 인생템 삭제
// ────────────────────────────────────────────────────────────

export async function removeHolyGrailProduct(
  holyGrailId: string
): Promise<ActionResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };

  try {
    await prisma.holyGrailProduct.delete({
      where: {
        id: holyGrailId,
        userId,
      },
    });

    revalidatePath("/(user)/onboarding");
    return { success: true };
  } catch (error) {
    console.error("[removeHolyGrailProduct Error]", error);
    return { success: false, error: "인생템 삭제 중 오류가 발생했습니다." };
  }
}

// ────────────────────────────────────────────────────────────
// Action 4: User Standard 생성 트리거 (S3-1)
// ────────────────────────────────────────────────────────────

export async function triggerStandardGeneration(): Promise<ActionResult<{ standardId: string; confidence: number }>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };

  try {
    const holyGrails = await prisma.holyGrailProduct.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            ingredients: {
              include: { ingredient: true },
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
    });

    if (holyGrails.length < 2) {
      return { success: false, error: "최소 2개의 인생템이 필요합니다." };
    }

    const inputs = holyGrails.map((hg) => ({
      productName: hg.product?.name ?? hg.customName ?? "Unknown",
      category: hg.category,
      satisfactionScore: hg.satisfactionScore,
      ingredients: (hg.product?.ingredients ?? []).map((pi) => ({
        ingredientId: pi.ingredient.id,
        nameInci: pi.ingredient.nameInci,
        nameKo: pi.ingredient.nameKo ?? undefined,
        orderIndex: pi.orderIndex,
        safetyGrade: pi.ingredient.safetyGrade,
        ewgScore: pi.ingredient.ewgScore ?? undefined,
        commonAllergen: pi.ingredient.commonAllergen,
        category: pi.ingredient.category ?? undefined,
        functions: pi.ingredient.function,
      })),
    }));

    const skinProfile = await prisma.skinProfile.findUnique({ where: { userId } });
    const allergies = skinProfile?.allergies ?? [];

    const standard = generateUserStandard(inputs, allergies);

    const saved = await prisma.userStandard.upsert({
      where: { userId },
      update: {
        version: { increment: 1 },
        preferredIngredients: standard.preferredIngredients as any,
        avoidIngredients: standard.avoidIngredients as any,
        ingredientPatterns: standard.detectedPatterns as any,
        confidenceScore: standard.overallConfidence,
        basedOnProductCount: standard.basedOnProductCount,
        lastAnalyzedAt: new Date(),
      },
      create: {
        userId,
        preferredIngredients: standard.preferredIngredients as any,
        avoidIngredients: standard.avoidIngredients as any,
        ingredientPatterns: standard.detectedPatterns as any,
        confidenceScore: standard.overallConfidence,
        basedOnProductCount: standard.basedOnProductCount,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { onboardingStatus: "COMPLETED" },
    });

    revalidatePath("/(user)");
    return {
      success: true,
      data: {
        standardId: saved.id,
        confidence: standard.overallConfidence,
      },
    };
  } catch (error) {
    console.error("[triggerStandardGeneration Error]", error);
    return { success: false, error: "개인 기준 생성 중 오류가 발생했습니다." };
  }
}

// ────────────────────────────────────────────────────────────
// Action 5: 온보딩 스킵
// ────────────────────────────────────────────────────────────

export async function skipOnboarding(
  skipTo: "PRODUCTS" | "COMPLETE"
): Promise<ActionResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };

  try {
    const status = skipTo === "PRODUCTS" ? "SKIN_PROFILED" : "COMPLETED";
    await prisma.user.update({
      where: { id: userId },
      data: { onboardingStatus: status },
    });

    revalidatePath("/(user)");
    return { success: true };
  } catch (error) {
    console.error("[skipOnboarding Error]", error);
    return { success: false, error: "스킵 처리 중 오류가 발생했습니다." };
  }
}
