// ============================================================
// COSFIT - Commerce Server Actions
// app/(user)/shop/actions.ts
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { sendOrderConfirmEmail } from "@/lib/email/mailer";

// ── Types ──

export interface CartItemData {
  id: string;
  productId: string;
  productName: string;
  productBrand: string;
  productCategory: string;
  productImage: string | null;
  quantity: number;
  unitPrice: number;
  fitScore: number | null;
  compareId: string | null;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  shippingFee: number;
  discountAmount: number;
  finalAmount: number;
  itemCount: number;
  firstProductName: string;
  orderedAt: string;
}

export interface OrderDetail extends OrderSummary {
  items: {
    id: string;
    productName: string;
    productBrand: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    fitScore: number | null;
  }[];
  payment: {
    method: string;
    status: string;
    approvalNumber: string | null;
    paidAt: string | null;
  } | null;
  shipping: {
    recipientName: string;
    phone: string;
    address: string;
    addressDetail: string | null;
    carrier: string | null;
    trackingNumber: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  } | null;
}

export interface CheckoutInput {
  shippingName: string;
  shippingPhone: string;
  shippingZip: string;
  shippingAddress: string;
  shippingDetail?: string;
  shippingMemo?: string;
  paymentMethod: "CARD" | "KAKAO_PAY" | "NAVER_PAY" | "TOSS_PAY";
}

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Helpers ──

function generateOrderNumber(): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = String(Math.floor(Math.random() * 99999)).padStart(5, "0");
  return `ORD-${date}-${rand}`;
}

// ── Cart Actions ──

export async function fetchCart(userId: string): Promise<ActionResult<CartItemData[]>> {
  try {
    const items = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: { include: { brand: true } } },
      orderBy: { createdAt: "desc" },
    });
    return {
      success: true,
      data: items.map((i: any) => ({
        id: i.id,
        productId: i.productId,
        productName: i.product.name,
        productBrand: i.product.brand.name,
        productCategory: i.product.category,
        productImage: i.product.imageUrl,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        fitScore: (i.metadata as any)?.fitScore ?? null,
        compareId: (i.metadata as any)?.compareId ?? null,
      })),
    };
  } catch (error) {
    return { success: false, error: "장바구니 조회 실패" };
  }
}

export async function addToCart(
  userId: string,
  productId: string,
  quantity: number,
  unitPrice: number,
  fitScore?: number,
  compareId?: string
): Promise<ActionResult<{ cartItemId: string }>> {
  try {
    const item = await prisma.cartItem.upsert({
      where: { userId_productId: { userId, productId } },
      update: { quantity: { increment: quantity } },
      create: {
        userId,
        productId,
        quantity,
        unitPrice,
        metadata: { fitScore, compareId },
      },
    });
    revalidatePath("/(user)/shop/cart");
    return { success: true, data: { cartItemId: item.id } };
  } catch (error) {
    return { success: false, error: "장바구니 추가 실패" };
  }
}

export async function updateCartQuantity(
  userId: string,
  cartItemId: string,
  quantity: number
): Promise<ActionResult> {
  try {
    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: cartItemId, userId } });
    } else {
      await prisma.cartItem.update({ where: { id: cartItemId, userId }, data: { quantity } });
    }
    revalidatePath("/(user)/shop/cart");
    return { success: true };
  } catch (error) {
    return { success: false, error: "수량 변경 실패" };
  }
}

export async function removeFromCart(userId: string, cartItemId: string): Promise<ActionResult> {
  try {
    await prisma.cartItem.delete({ where: { id: cartItemId, userId } });
    revalidatePath("/(user)/shop/cart");
    return { success: true };
  } catch (error) {
    return { success: false, error: "장바구니 삭제 실패" };
  }
}

// ── Checkout (Transaction) ──

export async function checkout(
  userId: string,
  input: CheckoutInput
): Promise<ActionResult<{ orderId: string; orderNumber: string; pgRedirectUrl: string }>> {
  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const cartItems = await tx.cartItem.findMany({
        where: { userId },
        include: { product: { include: { brand: true } } },
      });
      if (cartItems.length === 0) throw new Error("장바구니가 비어있습니다.");

      // 재고 검증 및 차감
      for (const ci of cartItems) {
        const product = await tx.productMaster.findUnique({ where: { id: ci.productId } }) as any;
        if (!product) throw new Error(`${ci.product.name} 상품을 찾을 수 없습니다.`);
        if (product.stock < ci.quantity) throw new Error(`${ci.product.name} 재고가 부족합니다. (재고: ${product.stock}개)`);
        await tx.productMaster.update({
          where: { id: ci.productId },
          data: { stock: { decrement: ci.quantity } },
        });
      }

      const totalAmount = cartItems.reduce((s: number, i: any) => s + i.unitPrice * i.quantity, 0);
      const shippingFee = totalAmount >= 50000 ? 0 : 3000;
      const finalAmount = totalAmount + shippingFee;

      const orderNumber = generateOrderNumber();
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          totalAmount,
          shippingFee,
          discountAmount: 0,
          finalAmount,
          status: "PENDING_PAYMENT",
          items: {
            create: cartItems.map((ci: any) => ({
              productId: ci.productId,
              partnerId: null,
              productName: ci.product.name,
              productBrand: ci.product.brand.name,
              quantity: ci.quantity,
              unitPrice: ci.unitPrice,
              totalPrice: ci.unitPrice * ci.quantity,
              fitScore: (ci.metadata as any)?.fitScore ?? null,
              compareId: (ci.metadata as any)?.compareId ?? null,
            })),
          },
          shipping: {
            create: {
              recipientName: input.shippingName,
              phone: input.shippingPhone,
              zipCode: input.shippingZip,
              address: input.shippingAddress,
              addressDetail: input.shippingDetail,
              memo: input.shippingMemo,
            },
          },
          payment: {
            create: {
              method: input.paymentMethod,
              status: "PENDING",
              amount: finalAmount,
              pgProvider: "toss",
            },
          },
        },
      });

      await tx.cartItem.deleteMany({ where: { userId } });
      return { orderId: order.id, orderNumber: order.orderNumber, finalAmount, cartItems };
    });

    // 주문 확인 이메일 (실패해도 주문 처리에 영향 없음)
    const user = await prisma.user.findUnique({ where: { id: userId } }) as any;
    if (user?.email) {
      sendOrderConfirmEmail({
        to: user.email,
        userName: user.name ?? "고객",
        orderNumber: result.orderNumber,
        finalAmount: result.finalAmount,
        items: result.cartItems.map((ci: any) => ({
          productName: ci.product.name,
          quantity: ci.quantity,
          unitPrice: ci.unitPrice,
        })),
      }).catch((err) => console.error("[OrderEmail Error]", err));
    }

    const pgRedirectUrl = `/api/v1/payment?action=request&orderId=${result.orderId}&amount=${result.finalAmount}&method=${input.paymentMethod}`;
    revalidatePath("/(user)/shop");
    return {
      success: true,
      data: { orderId: result.orderId, orderNumber: result.orderNumber, pgRedirectUrl },
    };
  } catch (error: any) {
    return { success: false, error: error.message ?? "주문 처리 실패" };
  }
}

// ── Order History ──

export async function fetchOrders(userId: string): Promise<ActionResult<OrderSummary[]>> {
  try {
    const orders = await prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { orderedAt: "desc" },
    });
    return {
      success: true,
      data: orders.map((o: any) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: o.totalAmount,
        shippingFee: o.shippingFee,
        discountAmount: o.discountAmount,
        finalAmount: o.finalAmount,
        itemCount: o.items.length,
        firstProductName: o.items[0]?.productName ?? "",
        orderedAt: o.orderedAt.toISOString(),
      })),
    };
  } catch (error) {
    return { success: false, error: "주문 내역 조회 실패" };
  }
}

export async function fetchOrderDetail(
  userId: string,
  orderId: string
): Promise<ActionResult<OrderDetail>> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId, userId },
      include: {
        items: true,
        payment: true,
        shipping: true,
      },
    });

    if (!order) return { success: false, error: "주문을 찾을 수 없습니다." };

    return {
      success: true,
      data: {
        id: (order as any).id,
        orderNumber: (order as any).orderNumber,
        status: (order as any).status,
        totalAmount: (order as any).totalAmount,
        shippingFee: (order as any).shippingFee,
        discountAmount: (order as any).discountAmount,
        finalAmount: (order as any).finalAmount,
        itemCount: (order as any).items.length,
        firstProductName: (order as any).items[0]?.productName ?? "",
        orderedAt: (order as any).orderedAt.toISOString(),
        items: (order as any).items.map((item: any) => ({
          id: item.id,
          productName: item.productName,
          productBrand: item.productBrand,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          fitScore: item.fitScore,
        })),
        payment: (order as any).payment
          ? {
              method: (order as any).payment.method,
              status: (order as any).payment.status,
              approvalNumber: (order as any).payment.approvalNumber,
              paidAt: (order as any).payment.paidAt?.toISOString() ?? null,
            }
          : null,
        shipping: (order as any).shipping
          ? {
              recipientName: (order as any).shipping.recipientName,
              phone: (order as any).shipping.phone,
              address: (order as any).shipping.address,
              addressDetail: (order as any).shipping.addressDetail,
              carrier: (order as any).shipping.carrier,
              trackingNumber: (order as any).shipping.trackingNumber,
              shippedAt: (order as any).shipping.shippedAt?.toISOString() ?? null,
              deliveredAt: (order as any).shipping.deliveredAt?.toISOString() ?? null,
            }
          : null,
      },
    };
  } catch (error) {
    return { success: false, error: "주문 상세 조회 실패" };
  }
}
