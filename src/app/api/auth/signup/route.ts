// ============================================================
// COSFIT - 회원가입 API
// POST /api/auth/signup
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, phone } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "이메일과 비밀번호는 필수입니다." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "비밀번호는 8자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "이미 사용 중인 이메일입니다." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        phone: phone || null,
        role: "USER",
        onboardingStatus: "PENDING",
      },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    console.error("[Signup Error]", error);
    return NextResponse.json(
      { success: false, error: "회원가입 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
