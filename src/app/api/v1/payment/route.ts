// ============================================================
// COSFIT - Payment API (PG 연동)
// app/api/v1/payment/route.ts
// ============================================================
// POST /api/v1/payment/request  → PG 결제 요청
// POST /api/v1/payment/confirm  → PG 결제 승인 (Webhook)
// POST /api/v1/payment/cancel   → 결제 취소
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ── PG 결제 요청 ──

export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action") ?? "request";

  try {
    const body = await request.json().catch(() => ({}));

    if (action === "request") {
      return handlePaymentRequest(body);
    } else if (action === "confirm") {
      return handlePaymentConfirm(body);
    } else if (action === "cancel") {
      return handlePaymentCancel(body);
    }

    return NextResponse.json(
      { success: false, error: { code: "INVALID_ACTION", message: "알 수 없는 액션입니다." } },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[Payment API Error]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "결제 처리 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}

// ── 결제 요청 → PG 리다이렉트 URL 생성 ──

async function handlePaymentRequest(body: any) {
  const { orderId, amount, method, userId } = body;

  if (!orderId || !amount) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_PARAMS", message: "orderId와 amount는 필수입니다." } },
      { status: 400 }
    );
  }

  // 1. 주문 확인
  const order = await prisma.order.findUnique({
    where: { id: orderId, userId },
    include: { payment: true },
  }) as any;
  if (!order) return NextResponse.json({ success: false, error: { code: "ORDER_NOT_FOUND", message: "주문을 찾을 수 없습니다." } }, { status: 404 });
  if (order.status !== "PENDING_PAYMENT") return NextResponse.json({ success: false, error: { code: "INVALID_ORDER_STATUS", message: "결제 불가 상태의 주문입니다." } }, { status: 400 });
  if (order.finalAmount !== amount) return NextResponse.json({ success: false, error: { code: "AMOUNT_MISMATCH", message: "금액이 일치하지 않습니다." } }, { status: 400 });

  // 2. PG사 결제 요청 (Toss Payments)
  const pgResponse = await fetch("https://api.tosspayments.com/v1/payments", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${Buffer.from((process.env.TOSS_SECRET_KEY ?? "") + ":").toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      orderId: order.orderNumber,
      orderName: `COSFIT 주문 (${order.orderNumber})`,
      successUrl: `${process.env.BASE_URL}/shop/payment/success`,
      failUrl: `${process.env.BASE_URL}/shop/payment/fail`,
      method: method === "KAKAO_PAY" ? "카카오페이" : method === "NAVER_PAY" ? "네이버페이" : "카드",
    }),
  });
  const pgData = await pgResponse.json();

  // 3. PG 거래번호 저장
  await prisma.payment.update({
    where: { orderId },
    data: { pgTransactionId: pgData.paymentKey },
  });

  return NextResponse.json({
    success: true,
    data: { redirectUrl: pgData.checkout?.url ?? pgData.mobileUrl },
  });
}

// ── 결제 승인 (PG Webhook / 클라이언트 콜백) ──

async function handlePaymentConfirm(body: any) {
  const { paymentKey, orderId, amount } = body;

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_PARAMS", message: "paymentKey, orderId, amount 필수" } },
      { status: 400 }
    );
  }

  // ★ Transaction으로 결제 승인 + 주문 상태 변경 원자적 처리
  const result = await prisma.$transaction(async (tx: any) => {
    // 1. PG 승인 API 호출
    const pgConfirm = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from((process.env.TOSS_SECRET_KEY ?? "") + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });
    const pgData = await pgConfirm.json();

    if (!pgConfirm.ok) {
      await tx.payment.update({
        where: { pgTransactionId: paymentKey },
        data: { status: "FAILED", failedAt: new Date(), failReason: pgData.message },
      });
      throw new Error(pgData.message ?? "PG 승인 실패");
    }

    // 2. Payment 상태 업데이트
    const payment = await tx.payment.update({
      where: { pgTransactionId: paymentKey },
      data: {
        status: "APPROVED",
        approvalNumber: pgData.approvalNumber ?? pgData.receipt?.url,
        receiptUrl: pgData.receipt?.url,
        paidAt: new Date(),
      },
    });

    // 3. Order 상태 → PAID
    await tx.order.update({
      where: { id: payment.orderId },
      data: { status: "PAID", statusChangedAt: new Date() },
    });

    return { orderId: payment.orderId };
  });

  return NextResponse.json({ success: true, data: result });
}

// ── 결제 취소/환불 ──

async function handlePaymentCancel(body: any) {
  const { orderId, cancelReason } = body;

  await prisma.$transaction(async (tx: any) => {
    const payment = await tx.payment.findUnique({ where: { orderId } });
    if (!payment || payment.status !== "APPROVED") throw new Error("취소 불가한 결제입니다.");

    // PG 취소 요청
    await fetch(`https://api.tosspayments.com/v1/payments/${payment.pgTransactionId}/cancel`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from((process.env.TOSS_SECRET_KEY ?? "") + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cancelReason }),
    });

    await tx.payment.update({ where: { orderId }, data: { status: "REFUNDED", refundedAt: new Date() } });
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED", statusChangedAt: new Date() } });
  });

  return NextResponse.json({ success: true, data: { orderId, status: "CANCELLED" } });
}
