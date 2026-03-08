// ============================================================
// COSFIT - 이메일 인증 API
// POST /api/auth/verify-email  → 인증 메일 발송
// GET  /api/auth/verify-email?token=xxx → 토큰 검증
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";

// ── 인증 메일 발송용 헬퍼 ──

async function sendVerificationEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // 개발 환경: 콘솔 출력
    console.log("[Email Verification (DEV)]", email, verifyUrl);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `COSFIT <noreply@${process.env.EMAIL_DOMAIN ?? "cosfit.kr"}>`,
      to: [email],
      subject: "[COSFIT] 이메일 인증을 완료해주세요",
      html: `
        <div style="font-family:Apple SD Gothic Neo,sans-serif;max-width:600px;margin:0 auto;color:#333;">
          <div style="background:#10B981;padding:24px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;">COSFIT</h1>
          </div>
          <div style="padding:32px 24px;">
            <p style="font-size:15px;">안녕하세요!</p>
            <p style="font-size:15px;">아래 버튼을 클릭하여 이메일 인증을 완료해주세요.</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${verifyUrl}"
                 style="display:inline-block;background:#10B981;color:#fff;padding:14px 40px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:700;">
                이메일 인증하기
              </a>
            </div>
            <p style="font-size:13px;color:#888;">
              이 링크는 24시간 동안 유효합니다.<br/>
              본인이 요청하지 않았다면 이 메일을 무시해주세요.
            </p>
          </div>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Email send failed: ${err}`);
  }
}

// ── POST: 인증 메일 발송 ──

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { success: false, error: "이미 인증된 이메일입니다." },
        { status: 400 }
      );
    }

    // 토큰 생성 (48자 hex)
    const token = crypto.randomBytes(24).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        emailVerifyToken: token,
        emailVerifyExpires: expires,
      },
    });

    await sendVerificationEmail(user.email, token);

    return NextResponse.json({ success: true, message: "인증 메일이 발송되었습니다." });
  } catch (error) {
    console.error("[Verify Email POST Error]", error);
    return NextResponse.json(
      { success: false, error: "인증 메일 발송 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// ── GET: 토큰 검증 ──

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/mypage?verify=invalid", request.url));
    }

    const user = await prisma.user.findFirst({
      where: {
        emailVerifyToken: token,
        emailVerifyExpires: { gte: new Date() },
      },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.redirect(new URL("/mypage?verify=expired", request.url));
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        emailVerifyToken: null,
        emailVerifyExpires: null,
      },
    });

    return NextResponse.redirect(new URL("/mypage?verify=success", request.url));
  } catch (error) {
    console.error("[Verify Email GET Error]", error);
    return NextResponse.redirect(new URL("/mypage?verify=error", request.url));
  }
}
