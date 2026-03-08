// ============================================================
// COSFIT - Partner Coupon & Promotion Server Actions
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ── Auth Helper ──
async function getAuthenticatedPartnerId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "PARTNER") {
    throw new Error("인증되지 않은 접근입니다.");
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

// ── Coupon Types ──
export interface CouponData {
  id: string;
  code: string;
  name: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface CouponFormData {
  code?: string;
  name: string;
  discountType: "FIXED" | "PERCENTAGE";
  discountValue: number;
  minOrderAmount?: number | null;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  startDate: string;
  endDate: string;
}

// ── Promotion Types ──
export interface PromotionData {
  id: string;
  type: string;
  title: string;
  startDate: string;
  endDate: string;
  config: unknown;
  isActive: boolean;
  productCount: number;
  products: {
    id: string;
    partnerProductId: string;
    specialPrice: number | null;
    productName: string;
  }[];
  createdAt: string;
}

export interface PromotionFormData {
  type: "TIMEDEAL" | "BUNDLE" | "EVENT";
  title: string;
  startDate: string;
  endDate: string;
  config?: Record<string, unknown>;
  products: { partnerProductId: string; specialPrice?: number | null }[];
}

export interface PartnerProductItem {
  id: string;
  productName: string;
  brandName: string;
  price: number | null;
}

// ── Coupon Code Generator ──
function generateCouponCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "CF-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================================
// COUPON ACTIONS
// ============================================================

export async function getCoupons(): Promise<{
  coupons: CouponData[];
  stats: { total: number; active: number; totalUsed: number };
}> {
  const partnerId = await getAuthenticatedPartnerId();

  const coupons = await prisma.coupon.findMany({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const active = coupons.filter(
    (c) => c.isActive && new Date(c.endDate) >= now && new Date(c.startDate) <= now
  ).length;
  const totalUsed = coupons.reduce((sum, c) => sum + c.usedCount, 0);

  return {
    coupons: coupons.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minOrderAmount: c.minOrderAmount,
      maxDiscount: c.maxDiscount,
      usageLimit: c.usageLimit,
      usedCount: c.usedCount,
      startDate: c.startDate.toISOString().split("T")[0],
      endDate: c.endDate.toISOString().split("T")[0],
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString().split("T")[0],
    })),
    stats: { total: coupons.length, active, totalUsed },
  };
}

export async function createCoupon(
  data: CouponFormData
): Promise<{ success: boolean; error?: string }> {
  const partnerId = await getAuthenticatedPartnerId();

  // Validation
  if (!data.name.trim()) return { success: false, error: "쿠폰 이름을 입력하세요." };
  if (data.discountValue <= 0) return { success: false, error: "할인값은 0보다 커야 합니다." };
  if (data.discountType === "PERCENTAGE" && data.discountValue > 100) {
    return { success: false, error: "할인율은 100%를 초과할 수 없습니다." };
  }
  if (new Date(data.endDate) <= new Date(data.startDate)) {
    return { success: false, error: "종료일은 시작일 이후여야 합니다." };
  }

  const code = data.code?.trim() || generateCouponCode();

  // Check code uniqueness
  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) return { success: false, error: "이미 사용 중인 쿠폰 코드입니다." };

  await prisma.coupon.create({
    data: {
      partnerId,
      code,
      name: data.name.trim(),
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderAmount: data.minOrderAmount || null,
      maxDiscount: data.maxDiscount || null,
      usageLimit: data.usageLimit || null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      isActive: true,
    },
  });

  revalidatePath("/partner/promotions/coupons");
  return { success: true };
}

export async function updateCoupon(
  couponId: string,
  data: CouponFormData
): Promise<{ success: boolean; error?: string }> {
  const partnerId = await getAuthenticatedPartnerId();

  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon || coupon.partnerId !== partnerId) {
    return { success: false, error: "쿠폰을 찾을 수 없습니다." };
  }

  // Validation
  if (!data.name.trim()) return { success: false, error: "쿠폰 이름을 입력하세요." };
  if (data.discountValue <= 0) return { success: false, error: "할인값은 0보다 커야 합니다." };
  if (data.discountType === "PERCENTAGE" && data.discountValue > 100) {
    return { success: false, error: "할인율은 100%를 초과할 수 없습니다." };
  }
  if (new Date(data.endDate) <= new Date(data.startDate)) {
    return { success: false, error: "종료일은 시작일 이후여야 합니다." };
  }

  // If code changed, check uniqueness
  const newCode = data.code?.trim() || coupon.code;
  if (newCode !== coupon.code) {
    const existing = await prisma.coupon.findUnique({ where: { code: newCode } });
    if (existing) return { success: false, error: "이미 사용 중인 쿠폰 코드입니다." };
  }

  await prisma.coupon.update({
    where: { id: couponId },
    data: {
      code: newCode,
      name: data.name.trim(),
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderAmount: data.minOrderAmount || null,
      maxDiscount: data.maxDiscount || null,
      usageLimit: data.usageLimit || null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    },
  });

  revalidatePath("/partner/promotions/coupons");
  return { success: true };
}

export async function toggleCouponActive(
  couponId: string
): Promise<{ success: boolean; error?: string }> {
  const partnerId = await getAuthenticatedPartnerId();

  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon || coupon.partnerId !== partnerId) {
    return { success: false, error: "쿠폰을 찾을 수 없습니다." };
  }

  await prisma.coupon.update({
    where: { id: couponId },
    data: { isActive: !coupon.isActive },
  });

  revalidatePath("/partner/promotions/coupons");
  return { success: true };
}

export async function deleteCoupon(
  couponId: string
): Promise<{ success: boolean; error?: string }> {
  const partnerId = await getAuthenticatedPartnerId();

  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon || coupon.partnerId !== partnerId) {
    return { success: false, error: "쿠폰을 찾을 수 없습니다." };
  }
  if (coupon.usedCount > 0) {
    return { success: false, error: "이미 사용된 쿠폰은 삭제할 수 없습니다." };
  }

  await prisma.coupon.delete({ where: { id: couponId } });

  revalidatePath("/partner/promotions/coupons");
  return { success: true };
}

// ============================================================
// PROMOTION ACTIONS
// ============================================================

export async function getPromotions(): Promise<PromotionData[]> {
  const partnerId = await getAuthenticatedPartnerId();

  const promotions = await prisma.promotion.findMany({
    where: { partnerId },
    include: {
      products: {
        include: {
          partnerProduct: {
            include: {
              product: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return promotions.map((p) => ({
    id: p.id,
    type: p.type,
    title: p.title,
    startDate: p.startDate.toISOString().split("T")[0],
    endDate: p.endDate.toISOString().split("T")[0],
    config: p.config,
    isActive: p.isActive,
    productCount: p.products.length,
    products: p.products.map((pp) => ({
      id: pp.id,
      partnerProductId: pp.partnerProductId,
      specialPrice: pp.specialPrice,
      productName: pp.partnerProduct.product.name,
    })),
    createdAt: p.createdAt.toISOString().split("T")[0],
  }));
}

export async function createPromotion(
  data: PromotionFormData
): Promise<{ success: boolean; error?: string }> {
  const partnerId = await getAuthenticatedPartnerId();

  if (!data.title.trim()) return { success: false, error: "프로모션 제목을 입력하세요." };
  if (new Date(data.endDate) <= new Date(data.startDate)) {
    return { success: false, error: "종료일은 시작일 이후여야 합니다." };
  }
  if (!data.products.length) {
    return { success: false, error: "최소 1개 이상의 제품을 선택하세요." };
  }

  // Verify all products belong to this partner
  const partnerProducts = await prisma.partnerProduct.findMany({
    where: {
      id: { in: data.products.map((p) => p.partnerProductId) },
      partnerId,
    },
  });
  if (partnerProducts.length !== data.products.length) {
    return { success: false, error: "일부 제품이 유효하지 않습니다." };
  }

  await prisma.promotion.create({
    data: {
      partnerId,
      type: data.type,
      title: data.title.trim(),
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      config: (data.config as object) || {},
      isActive: true,
      products: {
        create: data.products.map((p) => ({
          partnerProductId: p.partnerProductId,
          specialPrice: p.specialPrice || null,
        })),
      },
    },
  });

  revalidatePath("/partner/promotions");
  return { success: true };
}

export async function updatePromotion(
  promotionId: string,
  data: PromotionFormData
): Promise<{ success: boolean; error?: string }> {
  const partnerId = await getAuthenticatedPartnerId();

  const promotion = await prisma.promotion.findUnique({ where: { id: promotionId } });
  if (!promotion || promotion.partnerId !== partnerId) {
    return { success: false, error: "프로모션을 찾을 수 없습니다." };
  }

  if (!data.title.trim()) return { success: false, error: "프로모션 제목을 입력하세요." };
  if (new Date(data.endDate) <= new Date(data.startDate)) {
    return { success: false, error: "종료일은 시작일 이후여야 합니다." };
  }

  // Verify products belong to partner
  if (data.products.length > 0) {
    const partnerProducts = await prisma.partnerProduct.findMany({
      where: {
        id: { in: data.products.map((p) => p.partnerProductId) },
        partnerId,
      },
    });
    if (partnerProducts.length !== data.products.length) {
      return { success: false, error: "일부 제품이 유효하지 않습니다." };
    }
  }

  await prisma.$transaction([
    // Delete existing promotion products
    prisma.promotionProduct.deleteMany({ where: { promotionId } }),
    // Update promotion
    prisma.promotion.update({
      where: { id: promotionId },
      data: {
        type: data.type,
        title: data.title.trim(),
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        config: (data.config as object) || {},
        products: {
          create: data.products.map((p) => ({
            partnerProductId: p.partnerProductId,
            specialPrice: p.specialPrice || null,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/partner/promotions");
  return { success: true };
}

export async function togglePromotionActive(
  promotionId: string
): Promise<{ success: boolean; error?: string }> {
  const partnerId = await getAuthenticatedPartnerId();

  const promotion = await prisma.promotion.findUnique({ where: { id: promotionId } });
  if (!promotion || promotion.partnerId !== partnerId) {
    return { success: false, error: "프로모션을 찾을 수 없습니다." };
  }

  await prisma.promotion.update({
    where: { id: promotionId },
    data: { isActive: !promotion.isActive },
  });

  revalidatePath("/partner/promotions");
  return { success: true };
}

export async function getPartnerProducts(): Promise<PartnerProductItem[]> {
  const partnerId = await getAuthenticatedPartnerId();

  const products = await prisma.partnerProduct.findMany({
    where: { partnerId },
    include: {
      product: {
        select: { name: true, price: true, brand: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return products.map((pp) => ({
    id: pp.id,
    productName: pp.product.name,
    brandName: pp.product.brand.name,
    price: pp.product.price,
  }));
}
