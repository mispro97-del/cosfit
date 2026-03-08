"use server";

// ============================================================
// COSFIT - Admin User Management Server Actions
// ============================================================

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  ADMIN_MENUS,
  createDefaultPermissions,
  createFullPermissions,
  type AdminPermissions,
} from "@/lib/admin-permissions";

// ── Helpers ──

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("인증 필요");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!user || user.role !== "ADMIN") throw new Error("관리자 권한이 필요합니다.");

  const adminUser = await prisma.adminUser.findUnique({
    where: { userId: session.user.id },
  });

  return { session, adminUser, userId: session.user.id };
}

async function requireSuperAdmin() {
  const { session, adminUser, userId } = await requireAdmin();
  if (!adminUser?.isSuperAdmin) throw new Error("슈퍼 관리자 권한이 필요합니다.");
  return { session, adminUser, userId };
}

// ── Actions ──

/**
 * 관리자 계정 목록 조회
 */
export async function getAdminUsers() {
  await requireAdmin();

  const adminUsers = await prisma.adminUser.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          profileImage: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ isSuperAdmin: "desc" }, { createdAt: "asc" }],
  });

  return adminUsers.map((au) => ({
    id: au.id,
    userId: au.userId,
    email: au.user.email,
    name: au.user.name,
    profileImage: au.user.profileImage,
    isSuperAdmin: au.isSuperAdmin,
    otpEnabled: au.otpEnabled,
    permissions: au.permissions as unknown as AdminPermissions,
    lastLoginAt: au.lastLoginAt?.toISOString() ?? null,
    createdAt: au.createdAt.toISOString(),
    userCreatedAt: au.user.createdAt.toISOString(),
  }));
}

export type AdminUserItem = Awaited<ReturnType<typeof getAdminUsers>>[number];

/**
 * 관리자 계정 생성 (Super Admin only)
 */
export async function createAdminUser(data: {
  email: string;
  name: string;
  password: string;
  permissions: AdminPermissions;
}) {
  await requireSuperAdmin();

  // 이메일 중복 확인
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    // 이미 User가 있으면 AdminUser만 생성
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { userId: existing.id },
    });
    if (existingAdmin) throw new Error("이미 관리자로 등록된 계정입니다.");

    // User role을 ADMIN으로 변경 & AdminUser 생성
    await prisma.$transaction([
      prisma.user.update({
        where: { id: existing.id },
        data: { role: "ADMIN" },
      }),
      prisma.adminUser.create({
        data: {
          userId: existing.id,
          permissions: data.permissions as any,
        },
      }),
    ]);

    return { success: true };
  }

  // 새 User + AdminUser 생성
  const passwordHash = await bcrypt.hash(data.password, 12);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: "ADMIN",
        onboardingStatus: "COMPLETED",
      },
    });

    await tx.adminUser.create({
      data: {
        userId: user.id,
        permissions: data.permissions as any,
      },
    });
  });

  return { success: true };
}

/**
 * 관리자 계정 수정
 */
export async function updateAdminUser(
  adminUserId: string,
  data: {
    name?: string;
    permissions?: AdminPermissions;
  }
) {
  await requireSuperAdmin();

  const adminUser = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    include: { user: true },
  });
  if (!adminUser) throw new Error("관리자를 찾을 수 없습니다.");

  await prisma.$transaction(async (tx) => {
    if (data.name) {
      await tx.user.update({
        where: { id: adminUser.userId },
        data: { name: data.name },
      });
    }

    if (data.permissions) {
      await tx.adminUser.update({
        where: { id: adminUserId },
        data: { permissions: data.permissions as any },
      });
    }
  });

  return { success: true };
}

/**
 * 관리자 계정 삭제 (Super Admin only, 자기 자신 삭제 불가)
 */
export async function deleteAdminUser(adminUserId: string) {
  const { userId } = await requireSuperAdmin();

  const adminUser = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
  });
  if (!adminUser) throw new Error("관리자를 찾을 수 없습니다.");
  if (adminUser.userId === userId) throw new Error("자기 자신은 삭제할 수 없습니다.");
  if (adminUser.isSuperAdmin) throw new Error("슈퍼 관리자는 삭제할 수 없습니다.");

  await prisma.$transaction([
    prisma.adminUser.delete({ where: { id: adminUserId } }),
    prisma.user.update({
      where: { id: adminUser.userId },
      data: { role: "USER" },
    }),
  ]);

  return { success: true };
}

/**
 * 글로벌 OTP 필수 설정 토글
 */
export async function toggleOtpRequirement(enabled: boolean) {
  await requireSuperAdmin();

  await prisma.systemSetting.upsert({
    where: { key: "otp_required" },
    update: { value: { enabled } },
    create: { key: "otp_required", value: { enabled } },
  });

  return { success: true, enabled };
}

/**
 * 글로벌 OTP 필수 설정 조회
 */
export async function getOtpRequirement(): Promise<boolean> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "otp_required" },
  });
  return (setting?.value as any)?.enabled ?? false;
}

/**
 * OTP 설정 데이터 생성 (placeholder)
 */
export async function getOtpSetupData(adminUserId: string) {
  await requireAdmin();

  const adminUser = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    include: { user: { select: { email: true } } },
  });
  if (!adminUser) throw new Error("관리자를 찾을 수 없습니다.");

  // Placeholder: 실제 구현 시 speakeasy 등으로 TOTP secret 생성
  const secret = `PLACEHOLDER_SECRET_${Date.now()}`;

  await prisma.adminUser.update({
    where: { id: adminUserId },
    data: { otpSecret: secret },
  });

  return {
    secret,
    qrCodeUrl: `otpauth://totp/COSFIT:${adminUser.user.email}?secret=${secret}&issuer=COSFIT`,
    email: adminUser.user.email,
  };
}

/**
 * OTP 토큰 검증 (placeholder)
 */
export async function verifyOtp(adminUserId: string, token: string) {
  await requireAdmin();

  const adminUser = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
  });
  if (!adminUser) throw new Error("관리자를 찾을 수 없습니다.");
  if (!adminUser.otpSecret) throw new Error("OTP가 설정되지 않았습니다.");

  // Placeholder: 실제 구현 시 speakeasy.totp.verify() 사용
  const isValid = token.length === 6 && /^\d+$/.test(token);

  if (isValid) {
    await prisma.adminUser.update({
      where: { id: adminUserId },
      data: { otpEnabled: true },
    });
  }

  return { success: isValid };
}

/**
 * OTP 비활성화
 */
export async function disableOtp(adminUserId: string) {
  await requireSuperAdmin();

  await prisma.adminUser.update({
    where: { id: adminUserId },
    data: { otpEnabled: false, otpSecret: null },
  });

  return { success: true };
}

/**
 * 관리자 메뉴 목록 반환
 */
export async function getMenuList() {
  return ADMIN_MENUS;
}

/**
 * 현재 로그인 사용자의 Super Admin 여부 확인
 */
export async function checkIsSuperAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return false;

  const adminUser = await prisma.adminUser.findUnique({
    where: { userId: session.user.id },
  });

  return adminUser?.isSuperAdmin ?? false;
}

/**
 * 비밀번호 초기화
 */
export async function resetAdminPassword(
  adminUserId: string,
  newPassword: string
) {
  await requireSuperAdmin();

  const adminUser = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
  });
  if (!adminUser) throw new Error("관리자를 찾을 수 없습니다.");

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: adminUser.userId },
    data: { passwordHash },
  });

  return { success: true };
}
