"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// ── 프로필 조회 ──

export async function getMyProfile() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      emailVerified: true,
      profileImage: true,
      onboardingStatus: true,
      createdAt: true,
      skinProfile: {
        select: {
          skinType: true,
          skinConcerns: true,
          sensitivityLevel: true,
        },
      },
      _count: {
        select: {
          compareResults: true,
          userProducts: true,
        },
      },
    },
  });

  if (!user) {
    return { success: false, error: "사용자를 찾을 수 없습니다." };
  }

  return {
    success: true,
    profile: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
      profileImage: user.profileImage,
      onboardingStatus: user.onboardingStatus,
      createdAt: user.createdAt.toISOString(),
      skinProfile: user.skinProfile
        ? {
            skinType: user.skinProfile.skinType,
            skinConcerns: user.skinProfile.skinConcerns,
            sensitivityLevel: user.skinProfile.sensitivityLevel,
          }
        : null,
      compareCount: user._count.compareResults,
      productCount: user._count.userProducts,
    },
  };
}

// ── 프로필 업데이트 ──

export async function updateProfile(data: { name?: string; phone?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const updateData: { name?: string; phone?: string | null } = {};

  if (data.name !== undefined) {
    const trimmedName = data.name.trim();
    if (trimmedName.length === 0) {
      return { success: false, error: "이름을 입력해주세요." };
    }
    if (trimmedName.length > 50) {
      return { success: false, error: "이름은 50자 이내로 입력해주세요." };
    }
    updateData.name = trimmedName;
  }

  if (data.phone !== undefined) {
    const trimmedPhone = data.phone.trim();
    if (trimmedPhone === "") {
      updateData.phone = null;
    } else {
      // 한국 휴대폰 번호 형식 검증 (010-XXXX-XXXX or 01XXXXXXXXX)
      const phoneClean = trimmedPhone.replace(/[-\s]/g, "");
      if (!/^01[0-9]{8,9}$/.test(phoneClean)) {
        return { success: false, error: "올바른 휴대폰 번호를 입력해주세요." };
      }
      updateData.phone = phoneClean;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return { success: false, error: "변경할 정보가 없습니다." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
  });

  return { success: true, message: "프로필이 업데이트되었습니다." };
}

// ── 비밀번호 변경 ──

export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: "새 비밀번호는 8자 이상이어야 합니다." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user || !user.passwordHash) {
    return { success: false, error: "소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다." };
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return { success: false, error: "현재 비밀번호가 올바르지 않습니다." };
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash },
  });

  return { success: true, message: "비밀번호가 변경되었습니다." };
}

// ── 이메일 인증 메일 발송 ──

export async function sendVerificationEmail() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, emailVerified: true },
    });

    if (!user) return { success: false, error: "사용자를 찾을 수 없습니다." };
    if (user.emailVerified) return { success: false, error: "이미 인증된 이메일입니다." };

    const crypto = await import("crypto");
    const token = crypto.randomBytes(24).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        emailVerifyToken: token,
        emailVerifyExpires: expires,
      },
    });

    // Send email (dev: console log, prod: Resend API)
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log("[Email Verification (DEV)]", user.email, verifyUrl);
    } else {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `COSFIT <noreply@${process.env.EMAIL_DOMAIN ?? "cosfit.kr"}>`,
          to: [user.email],
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
                <p style="font-size:13px;color:#888;">이 링크는 24시간 동안 유효합니다.</p>
              </div>
            </div>
          `,
        }),
      });
    }

    return { success: true, message: "인증 메일이 발송되었습니다." };
  } catch (error) {
    console.error("[sendVerificationEmail Error]", error);
    return { success: false, error: "인증 메일 발송 중 오류가 발생했습니다." };
  }
}

// ── 이메일 인증 상태 확인 ──

export async function checkEmailVerification() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "로그인이 필요합니다.", verified: false };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  });

  return {
    success: true,
    verified: !!user?.emailVerified,
    verifiedAt: user?.emailVerified?.toISOString() ?? null,
  };
}
