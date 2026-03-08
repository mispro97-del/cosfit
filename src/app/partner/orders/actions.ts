// ============================================================
// COSFIT - Partner Orders Server Actions
// src/app/partner/orders/actions.ts
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ── Auth Helper ──

async function getAuthenticatedPartnerId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, partnerId: true },
  });
  if (!user || user.role !== "PARTNER" || !user.partnerId) return null;
  return user.partnerId;
}

// ── Types ──

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface OrderItemView {
  id: string;
  productName: string;
  productBrand: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  fitScore: number | null;
}

export interface PartnerOrderView {
  orderId: string;
  orderNumber: string;
  status: string;
  buyerName: string;
  items: OrderItemView[];
  orderTotal: number;
  shippingFee: number;
  finalAmount: number;
  orderedAt: string;
  carrier: string | null;
  trackingNumber: string | null;
}

export interface OrderStats {
  pendingCount: number;
  todayOrderCount: number;
  monthRevenue: number;
  totalOrders: number;
}

export type OrderFilterStatus =
  | "ALL"
  | "PENDING_PAYMENT"
  | "PAID"
  | "PREPARING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderFilter {
  status?: OrderFilterStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface OrderDetailView {
  orderId: string;
  orderNumber: string;
  status: string;
  statusChangedAt: string;
  buyerName: string;
  items: OrderItemView[];
  orderTotal: number;
  shippingFee: number;
  discountAmount: number;
  finalAmount: number;
  orderedAt: string;
  shipping: {
    recipientName: string;
    phone: string;
    zipCode: string;
    address: string;
    addressDetail: string | null;
    memo: string | null;
    carrier: string | null;
    trackingNumber: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  } | null;
}

// ── Helper: Mask customer name (김** format) ──

function maskName(name: string | null | undefined): string {
  if (!name || name.length === 0) return "***";
  if (name.length === 1) return name + "**";
  return name[0] + "*".repeat(name.length - 1);
}

// ── 1. Get Partner Orders ──

export async function getPartnerOrders(
  filter?: OrderFilter
): Promise<ActionResult<PartnerOrderView[]>> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    // Get all order IDs that contain this partner's items
    const partnerItems = await prisma.orderItem.findMany({
      where: { partnerId },
      select: { orderId: true },
    });
    const orderIds = [...new Set(partnerItems.map((i) => i.orderId))];

    if (orderIds.length === 0) {
      return { success: true, data: [] };
    }

    // Build where clause
    const statusFilter =
      filter?.status && filter.status !== "ALL"
        ? { status: filter.status as any }
        : {};

    const dateFilter: any = {};
    if (filter?.dateFrom) {
      dateFilter.orderedAt = { ...dateFilter.orderedAt, gte: new Date(filter.dateFrom) };
    }
    if (filter?.dateTo) {
      const to = new Date(filter.dateTo);
      to.setHours(23, 59, 59, 999);
      dateFilter.orderedAt = { ...dateFilter.orderedAt, lte: to };
    }

    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        ...statusFilter,
        ...dateFilter,
      },
      include: {
        items: {
          where: { partnerId },
          include: {
            product: { include: { brand: true } },
          },
        },
        shipping: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data: PartnerOrderView[] = orders.map((order) => {
      const buyerDisplayName = order.shipping?.recipientName
        ? maskName(order.shipping.recipientName)
        : maskName(order.user?.name);

      const partnerItemsTotal = order.items.reduce((s, i) => s + i.totalPrice, 0);

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        buyerName: buyerDisplayName,
        items: order.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          productBrand: item.productBrand,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          fitScore: item.fitScore,
        })),
        orderTotal: partnerItemsTotal,
        shippingFee: order.shippingFee,
        finalAmount: order.finalAmount,
        orderedAt: order.orderedAt.toISOString(),
        carrier: order.shipping?.carrier ?? null,
        trackingNumber: order.shipping?.trackingNumber ?? null,
      };
    });

    return { success: true, data };
  } catch (error) {
    console.error("[getPartnerOrders Error]", error);
    return { success: false, error: "주문 목록 조회에 실패했습니다." };
  }
}

// ── 2. Get Order Detail ──

export async function getOrderDetail(
  orderId: string
): Promise<ActionResult<OrderDetailView>> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          where: { partnerId },
          include: {
            product: { include: { brand: true } },
          },
        },
        shipping: true,
        user: { select: { name: true } },
      },
    });

    if (!order || order.items.length === 0) {
      return { success: false, error: "주문을 찾을 수 없습니다." };
    }

    const buyerDisplayName = order.shipping?.recipientName
      ? maskName(order.shipping.recipientName)
      : maskName(order.user?.name);

    const partnerItemsTotal = order.items.reduce((s, i) => s + i.totalPrice, 0);

    const data: OrderDetailView = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      statusChangedAt: order.statusChangedAt.toISOString(),
      buyerName: buyerDisplayName,
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        productBrand: item.productBrand,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        fitScore: item.fitScore,
      })),
      orderTotal: partnerItemsTotal,
      shippingFee: order.shippingFee,
      discountAmount: order.discountAmount,
      finalAmount: order.finalAmount,
      orderedAt: order.orderedAt.toISOString(),
      shipping: order.shipping
        ? {
            recipientName: maskName(order.shipping.recipientName),
            phone: order.shipping.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2"),
            zipCode: order.shipping.zipCode,
            address: order.shipping.address,
            addressDetail: order.shipping.addressDetail,
            memo: order.shipping.memo,
            carrier: order.shipping.carrier,
            trackingNumber: order.shipping.trackingNumber,
            shippedAt: order.shipping.shippedAt?.toISOString() ?? null,
            deliveredAt: order.shipping.deliveredAt?.toISOString() ?? null,
          }
        : null,
    };

    return { success: true, data };
  } catch (error) {
    console.error("[getOrderDetail Error]", error);
    return { success: false, error: "주문 상세 조회에 실패했습니다." };
  }
}

// ── 3. Update Order Status ──
// When SHIPPED: auto-create InventoryLog OUT entry

export async function updateOrderStatus(
  orderId: string,
  newStatus: "PAID" | "PREPARING" | "SHIPPED" | "DELIVERED"
): Promise<ActionResult> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    // Verify this order has partner's items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          where: { partnerId },
          include: { product: true },
        },
        shipping: true,
        user: { select: { name: true, email: true } },
      },
    });

    if (!order || order.items.length === 0) {
      return { success: false, error: "주문을 찾을 수 없습니다." };
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      PENDING_PAYMENT: ["PAID", "CANCELLED"],
      PAID: ["PREPARING", "CANCELLED"],
      PREPARING: ["SHIPPED"],
      SHIPPED: ["DELIVERED"],
    };

    const allowed = validTransitions[order.status];
    if (!allowed || !allowed.includes(newStatus)) {
      return {
        success: false,
        error: `현재 상태(${order.status})에서 ${newStatus}로 변경할 수 없습니다.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus, statusChangedAt: new Date() },
      });

      // When status changes to SHIPPED: auto-decrease variant stock via InventoryLog
      if (newStatus === "SHIPPED") {
        for (const item of order.items) {
          // Find the partner product variant for this item
          const partnerProduct = await tx.partnerProduct.findFirst({
            where: { partnerId, productId: item.productId },
            include: { variants: { where: { isActive: true }, take: 1 } },
          });

          if (partnerProduct && partnerProduct.variants.length > 0) {
            const variant = partnerProduct.variants[0];
            const newStock = Math.max(0, variant.stock - item.quantity);

            await tx.inventoryLog.create({
              data: {
                variantId: variant.id,
                type: "OUT",
                quantity: item.quantity,
                reason: `주문 출고 (${order.orderNumber})`,
              },
            });

            await tx.productVariant.update({
              where: { id: variant.id },
              data: { stock: newStock },
            });
          }
        }

        // Update shipping info
        if (order.shipping) {
          await tx.shippingInfo.update({
            where: { orderId },
            data: { shippedAt: new Date() },
          });
        }
      }

      if (newStatus === "DELIVERED" && order.shipping) {
        await tx.shippingInfo.update({
          where: { orderId },
          data: { deliveredAt: new Date() },
        });
      }
    });

    revalidatePath("/partner/orders");
    revalidatePath("/partner/inventory");
    return { success: true };
  } catch (error) {
    console.error("[updateOrderStatus Error]", error);
    return { success: false, error: "주문 상태 변경에 실패했습니다." };
  }
}

// ── 4. Update Shipping Info ──

export async function updateShippingInfo(
  orderId: string,
  carrier: string,
  trackingNumber: string
): Promise<ActionResult> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  if (!carrier || !trackingNumber) {
    return { success: false, error: "택배사와 운송장 번호를 입력해주세요." };
  }

  try {
    // Verify order ownership
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId, partnerId },
    });
    if (orderItems.length === 0) {
      return { success: false, error: "주문을 찾을 수 없습니다." };
    }

    await prisma.shippingInfo.update({
      where: { orderId },
      data: { carrier, trackingNumber },
    });

    revalidatePath("/partner/orders");
    return { success: true };
  } catch (error) {
    console.error("[updateShippingInfo Error]", error);
    return { success: false, error: "배송 정보 업데이트에 실패했습니다." };
  }
}

// ── 5. Get Order Stats ──

export async function getOrderStats(): Promise<ActionResult<OrderStats>> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    // Get all order IDs for this partner
    const partnerItems = await prisma.orderItem.findMany({
      where: { partnerId },
      select: { orderId: true, totalPrice: true },
      distinct: ["orderId"],
    });

    const orderIds = partnerItems.map((i) => i.orderId);

    if (orderIds.length === 0) {
      return {
        success: true,
        data: { pendingCount: 0, todayOrderCount: 0, monthRevenue: 0, totalOrders: 0 },
      };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [pendingOrders, todayOrders, monthItems] = await Promise.all([
      // Pending = PAID or PREPARING (need attention)
      prisma.order.count({
        where: {
          id: { in: orderIds },
          status: { in: ["PAID", "PREPARING"] },
        },
      }),
      // Today's orders
      prisma.order.count({
        where: {
          id: { in: orderIds },
          orderedAt: { gte: todayStart },
        },
      }),
      // This month's revenue (from partner's items only)
      prisma.orderItem.findMany({
        where: {
          partnerId,
          order: {
            orderedAt: { gte: monthStart },
            status: { notIn: ["CANCELLED", "RETURNED"] },
          },
        },
        select: { totalPrice: true },
      }),
    ]);

    const monthRevenue = monthItems.reduce((sum, item) => sum + item.totalPrice, 0);

    return {
      success: true,
      data: {
        pendingCount: pendingOrders,
        todayOrderCount: todayOrders,
        monthRevenue,
        totalOrders: orderIds.length,
      },
    };
  } catch (error) {
    console.error("[getOrderStats Error]", error);
    return { success: false, error: "주문 통계 조회에 실패했습니다." };
  }
}
