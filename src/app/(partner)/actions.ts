// ============================================================
// COSFIT - Partner Center Server Actions
// app/(partner)/actions.ts
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { sendShippingStartEmail } from "@/lib/email/mailer";

// ── Types ──

export interface PartnerDashboardData {
  overview: {
    totalProducts: number;
    totalCompares: number;
    avgFitScore: number;
    avgFitScoreDelta: number;
    holyGrailCount: number;
    uniqueUsers: number;
  };
  fitScoreDistribution: { grade: string; count: number; pct: number }[];
  topProducts: {
    id: string;
    name: string;
    category: string;
    avgFitScore: number;
    compareCount: number;
    holyGrailCount: number;
  }[];
  topMatchedIngredients: { name: string; nameKo: string; count: number }[];
  topRiskIngredients: { name: string; nameKo: string; count: number }[];
  monthlyTrend: { month: string; compares: number; avgScore: number }[];
}

export interface PartnerProductDetail {
  id: string;
  productId: string;
  name: string;
  brand: string;
  category: string;
  status: string;
  imageUrl: string | null;
  ingredientCount: number;
  avgFitScore: number | null;
  compareCount: number;
  customDescription: string | null;
  isPromoted: boolean;
}

export interface PartnerOrderItem {
  id: string;
  orderNumber: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  orderStatus: string;
  buyerName: string;
  orderedAt: string;
  carrier: string | null;
  trackingNumber: string | null;
}

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Actions ──

export async function fetchPartnerDashboard(partnerId: string): Promise<ActionResult<PartnerDashboardData>> {
  try {
    const [snapshots, partnerProducts] = await Promise.all([
      prisma.partnerStatSnapshot.findMany({
        where: { partnerId, periodType: "MONTHLY" },
        orderBy: { periodDate: "desc" },
        take: 6,
      }),
      prisma.partnerProduct.findMany({
        where: { partnerId },
        include: { product: { include: { brand: true } } },
      }),
    ]);

    const latestSnapshot = snapshots[0];
    const overview = {
      totalProducts: partnerProducts.length,
      totalCompares: latestSnapshot?.totalCompares ?? 0,
      avgFitScore: latestSnapshot?.averageFitScore ?? 0,
      avgFitScoreDelta: 0,
      holyGrailCount: 0,
      uniqueUsers: latestSnapshot?.uniqueUsers ?? 0,
    };

    const fitScoreDistribution = latestSnapshot
      ? Object.entries(latestSnapshot.fitScoreDistribution as Record<string, number>).map(([grade, count]) => ({
          grade,
          count,
          pct: overview.totalCompares > 0 ? Math.round((count / overview.totalCompares) * 1000) / 10 : 0,
        }))
      : [];

    const topProducts = partnerProducts.slice(0, 5).map((pp: any) => ({
      id: pp.id,
      name: pp.product.name,
      category: pp.product.category,
      avgFitScore: 0,
      compareCount: 0,
      holyGrailCount: 0,
    }));

    const monthlyTrend = snapshots.reverse().map((s: any) => ({
      month: new Date(s.periodDate).toLocaleDateString("ko-KR", { month: "long" }),
      compares: s.totalCompares,
      avgScore: s.averageFitScore,
    }));

    return {
      success: true,
      data: {
        overview,
        fitScoreDistribution,
        topProducts,
        topMatchedIngredients: (latestSnapshot?.topMatchedIngredients as any[]) ?? [],
        topRiskIngredients: (latestSnapshot?.topRiskIngredients as any[]) ?? [],
        monthlyTrend,
      },
    };
  } catch (error) {
    console.error("[fetchPartnerDashboard Error]", error);
    return { success: false, error: "대시보드 데이터를 불러오는 데 실패했습니다." };
  }
}

export async function fetchPartnerProducts(partnerId: string): Promise<ActionResult<PartnerProductDetail[]>> {
  try {
    const partnerProducts = await prisma.partnerProduct.findMany({
      where: { partnerId },
      include: {
        product: {
          include: { brand: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data: PartnerProductDetail[] = partnerProducts.map((pp: any) => ({
      id: pp.id,
      productId: pp.productId,
      name: pp.product.name,
      brand: pp.product.brand.name,
      category: pp.product.category,
      status: pp.product.status,
      imageUrl: pp.product.imageUrl,
      ingredientCount: pp.product.ingredientCount,
      avgFitScore: null,
      compareCount: 0,
      customDescription: (pp.customData as any)?.customDescription ?? null,
      isPromoted: pp.isPromoted,
    }));

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "제품 목록 조회에 실패했습니다." };
  }
}

export async function updateProductCustomData(
  partnerId: string,
  partnerProductId: string,
  data: { customDescription?: string; isPromoted?: boolean }
): Promise<ActionResult> {
  try {
    await prisma.partnerProduct.update({
      where: { id: partnerProductId, partnerId },
      data: {
        customData: data,
        isPromoted: data.isPromoted,
      },
    });

    revalidatePath("/(partner)/products");
    return { success: true };
  } catch (error) {
    return { success: false, error: "제품 정보 수정에 실패했습니다." };
  }
}

export async function fetchPartnerOrders(partnerId: string): Promise<ActionResult<PartnerOrderItem[]>> {
  try {
    const items = await prisma.orderItem.findMany({
      where: { partnerId },
      include: {
        order: {
          include: { shipping: true },
        },
      },
      orderBy: { order: { orderedAt: "desc" } },
    });

    const data: PartnerOrderItem[] = items.map((item: any) => ({
      id: item.id,
      orderNumber: item.order.orderNumber,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      orderStatus: item.order.status,
      buyerName: item.order.shipping?.recipientName
        ? item.order.shipping.recipientName.slice(0, 1) + "*" + item.order.shipping.recipientName.slice(-1)
        : "***",
      orderedAt: item.order.orderedAt.toISOString(),
      carrier: item.order.shipping?.carrier ?? null,
      trackingNumber: item.order.shipping?.trackingNumber ?? null,
    }));

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "주문 조회 실패" };
  }
}

export async function updateShipping(
  partnerId: string,
  orderItemId: string,
  carrier: string,
  trackingNumber: string
): Promise<ActionResult> {
  try {
    await prisma.$transaction(async (tx: any) => {
      const item = await tx.orderItem.findUnique({
        where: { id: orderItemId },
        include: { order: { include: { shipping: true } } },
      });
      if (!item || item.partnerId !== partnerId) throw new Error("권한 없음");

      await tx.shippingInfo.update({
        where: { orderId: item.orderId },
        data: { carrier, trackingNumber, shippedAt: new Date() },
      });
      await tx.order.update({
        where: { id: item.orderId },
        data: { status: "SHIPPED", statusChangedAt: new Date() },
      });
      return { orderId: item.orderId, orderNumber: item.order.orderNumber };
    }).then(async (info: any) => {
      // 배송 시작 이메일 (비동기, 실패해도 무시)
      const order = await prisma.order.findUnique({
        where: { id: info.orderId },
        include: { user: true },
      }) as any;
      if (order?.user?.email) {
        sendShippingStartEmail({
          to: order.user.email,
          userName: order.user.name ?? "고객",
          orderNumber: info.orderNumber,
          carrier,
          trackingNumber,
        }).catch((err) => console.error("[ShippingEmail Error]", err));
      }
    });

    revalidatePath("/(partner)/orders");
    return { success: true };
  } catch (error) {
    return { success: false, error: "배송 정보 업데이트 실패" };
  }
}

export async function processReturn(
  partnerId: string,
  orderItemId: string,
  approve: boolean
): Promise<ActionResult> {
  try {
    await prisma.$transaction(async (tx: any) => {
      const item = await tx.orderItem.findUnique({
        where: { id: orderItemId },
        include: { order: true },
      });
      if (!item || item.partnerId !== partnerId) throw new Error("권한 없음");

      const newStatus = approve ? "RETURNED" : "SHIPPED";
      await tx.order.update({
        where: { id: item.orderId },
        data: { status: newStatus, statusChangedAt: new Date() },
      });
      if (approve) {
        await tx.payment.update({
          where: { orderId: item.orderId },
          data: { status: "REFUNDED", refundedAt: new Date() },
        });
      }
    });

    revalidatePath("/(partner)/orders");
    return { success: true };
  } catch (error) {
    return { success: false, error: "반품 처리 실패" };
  }
}
