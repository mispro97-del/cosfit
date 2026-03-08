// ============================================================
// COSFIT - Coupon Apply API (User-facing)
// POST /api/v1/coupons/apply
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await req.json();
    const { code, orderAmount } = body as { code?: string; orderAmount?: number };

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "쿠폰 코드를 입력하세요." }, { status: 400 });
    }
    if (!orderAmount || typeof orderAmount !== "number" || orderAmount <= 0) {
      return NextResponse.json({ error: "유효한 주문 금액을 입력하세요." }, { status: 400 });
    }

    // Find coupon
    const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });

    if (!coupon) {
      return NextResponse.json({ valid: false, error: "존재하지 않는 쿠폰입니다." }, { status: 404 });
    }

    // Active check
    if (!coupon.isActive) {
      return NextResponse.json({ valid: false, error: "비활성 쿠폰입니다." }, { status: 400 });
    }

    // Date check
    const now = new Date();
    if (now < coupon.startDate) {
      return NextResponse.json({ valid: false, error: "아직 사용 기간이 아닙니다." }, { status: 400 });
    }
    if (now > coupon.endDate) {
      return NextResponse.json({ valid: false, error: "사용 기간이 만료된 쿠폰입니다." }, { status: 400 });
    }

    // Usage limit check
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ valid: false, error: "쿠폰 사용 한도가 초과되었습니다." }, { status: 400 });
    }

    // Min order amount check
    if (coupon.minOrderAmount !== null && orderAmount < coupon.minOrderAmount) {
      return NextResponse.json(
        {
          valid: false,
          error: `최소 주문금액 ${coupon.minOrderAmount.toLocaleString()}원 이상이어야 합니다.`,
        },
        { status: 400 }
      );
    }

    // Calculate discount
    let discount: number;
    if (coupon.discountType === "PERCENTAGE") {
      discount = Math.floor(orderAmount * (coupon.discountValue / 100));
      // Apply max discount cap
      if (coupon.maxDiscount !== null && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      // FIXED
      discount = coupon.discountValue;
    }

    // Discount cannot exceed order amount
    if (discount > orderAmount) {
      discount = orderAmount;
    }

    return NextResponse.json({
      valid: true,
      discount,
      couponId: coupon.id,
      couponName: coupon.name,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    });
  } catch (error) {
    console.error("[Coupon Apply Error]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
