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
    const { email, password, name, role } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: "이메일, 비밀번호, 이름은 필수입니다." },
        { status: 400 }
      );
    }

    // role은 USER 또는 PARTNER만 허용 (ADMIN은 시스템에서만 생성)
    const validRole = role === "PARTNER" ? "PARTNER" : "USER";

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
        name,
        role: validRole,
        onboardingStatus: validRole === "PARTNER" ? "COMPLETED" : "PENDING",
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
