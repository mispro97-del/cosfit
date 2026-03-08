// ============================================================
// COSFIT - Admin Member Management Server Actions
// ============================================================

"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ── Auth Guard ──

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("관리자 권한이 필요합니다.");
  }
  return session.user;
}

// ── Types ──

export interface MemberDashboard {
  todaySignups: number;
  monthSignups: number;
  yearSignups: number;
  totalMembers: number;
  activeMembers: number;
}

export interface MemberListItem {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  lastLoginAt: string | null;
  onboardingStatus: string;
}

export interface MemberListResult {
  members: MemberListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface MemberDetail {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  emailVerified: string | null;
  onboardingStatus: string;
  skinProfile: {
    skinType: string;
    skinConcerns: string[];
    allergies: string[];
    sensitivityLevel: number;
    ageGroup: string | null;
    gender: string | null;
  } | null;
  orderCount: number;
  totalSpent: number;
  recentOrders: {
    id: string;
    orderNumber: string;
    orderedAt: string;
    finalAmount: number;
    status: string;
    itemCount: number;
  }[];
  compareCount: number;
  userProductCount: number;
  routineAnalysisCount: number;
  recommendationCount: number;
}

// ── 1. Member Dashboard ──

export async function getMemberDashboard(): Promise<MemberDashboard> {
  await requireAdmin();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [todaySignups, monthSignups, yearSignups, totalMembers] = await Promise.all([
    prisma.user.count({ where: { role: "USER", createdAt: { gte: todayStart } } }),
    prisma.user.count({ where: { role: "USER", createdAt: { gte: monthStart } } }),
    prisma.user.count({ where: { role: "USER", createdAt: { gte: yearStart } } }),
    prisma.user.count({ where: { role: "USER" } }),
  ]);

  // Active members: users with sessions in last 30 days
  const activeSessions = await prisma.session.findMany({
    where: { expires: { gte: thirtyDaysAgo } },
    select: { userId: true },
    distinct: ["userId"],
  });

  return {
    todaySignups,
    monthSignups,
    yearSignups,
    totalMembers,
    activeMembers: activeSessions.length,
  };
}

// ── 2. Member List with Pagination & Search ──

export async function getMembers(
  page: number = 1,
  search: string = "",
  onboardingFilter: string = ""
): Promise<MemberListResult> {
  await requireAdmin();

  const perPage = 20;
  const skip = (page - 1) * perPage;

  const where: any = { role: "USER" as const };

  if (search.trim()) {
    where.OR = [
      { name: { contains: search.trim(), mode: "insensitive" } },
      { email: { contains: search.trim(), mode: "insensitive" } },
    ];
  }

  if (onboardingFilter && onboardingFilter !== "ALL") {
    where.onboardingStatus = onboardingFilter;
  }

  const [members, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        onboardingStatus: true,
        sessions: {
          orderBy: { expires: "desc" },
          take: 1,
          select: { expires: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: perPage,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      createdAt: m.createdAt.toISOString().slice(0, 10),
      lastLoginAt: m.sessions[0]?.expires.toISOString().slice(0, 10) ?? null,
      onboardingStatus: m.onboardingStatus,
    })),
    total,
    page,
    totalPages: Math.ceil(total / perPage),
  };
}

// ── 3. Member Detail ──

export async function getMemberDetail(userId: string): Promise<MemberDetail | null> {
  await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId, role: "USER" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      emailVerified: true,
      onboardingStatus: true,
      skinProfile: {
        select: {
          skinType: true,
          skinConcerns: true,
          allergies: true,
          sensitivityLevel: true,
          ageGroup: true,
          gender: true,
        },
      },
      orders: {
        orderBy: { orderedAt: "desc" },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          orderedAt: true,
          finalAmount: true,
          status: true,
          items: { select: { id: true } },
        },
      },
      compareResults: { select: { id: true } },
      userProducts: { select: { id: true } },
      routineAnalyses: { select: { id: true } },
      recommendations: { select: { id: true } },
      sessions: {
        orderBy: { expires: "desc" },
        take: 1,
        select: { expires: true },
      },
    },
  });

  if (!user) return null;

  const totalSpent = user.orders.reduce((sum, o) => sum + o.finalAmount, 0);

  // Try to get phone from DB (may not exist yet if migration not applied)
  let phone: string | null = null;
  try {
    const raw: any = await prisma.$queryRaw`SELECT "phone" FROM "users" WHERE "id" = ${userId}`;
    if (raw?.[0]?.phone) phone = raw[0].phone;
  } catch {
    // phone column may not exist yet
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone,
    createdAt: user.createdAt.toISOString().slice(0, 10),
    lastLoginAt: user.sessions[0]?.expires.toISOString().slice(0, 10) ?? null,
    emailVerified: user.emailVerified?.toISOString().slice(0, 10) ?? null,
    onboardingStatus: user.onboardingStatus,
    skinProfile: user.skinProfile
      ? {
          skinType: user.skinProfile.skinType,
          skinConcerns: user.skinProfile.skinConcerns,
          allergies: user.skinProfile.allergies,
          sensitivityLevel: user.skinProfile.sensitivityLevel,
          ageGroup: user.skinProfile.ageGroup,
          gender: user.skinProfile.gender,
        }
      : null,
    orderCount: user.orders.length,
    totalSpent,
    recentOrders: user.orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      orderedAt: o.orderedAt.toISOString().slice(0, 10),
      finalAmount: o.finalAmount,
      status: o.status,
      itemCount: o.items.length,
    })),
    compareCount: user.compareResults.length,
    userProductCount: user.userProducts.length,
    routineAnalysisCount: user.routineAnalyses.length,
    recommendationCount: user.recommendations.length,
  };
}

// ── 4. Update Member Status (Suspend / Activate) ──

export async function updateMemberStatus(
  userId: string,
  action: "SUSPEND" | "ACTIVATE"
): Promise<{ success: boolean; message: string }> {
  await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user || user.role !== "USER") {
    return { success: false, message: "해당 회원을 찾을 수 없습니다." };
  }

  if (action === "SUSPEND") {
    // Delete all active sessions to force logout
    await prisma.session.deleteMany({ where: { userId } });

    // Log the suspension
    await prisma.activityLog.create({
      data: {
        userId,
        action: "MEMBER_SUSPENDED",
        entityType: "USER",
        entityId: userId,
        metadata: { action: "SUSPEND", timestamp: new Date().toISOString() },
      },
    });

    revalidatePath("/admin/members");
    return { success: true, message: "회원이 정지되었습니다. 모든 세션이 종료되었습니다." };
  }

  if (action === "ACTIVATE") {
    await prisma.activityLog.create({
      data: {
        userId,
        action: "MEMBER_ACTIVATED",
        entityType: "USER",
        entityId: userId,
        metadata: { action: "ACTIVATE", timestamp: new Date().toISOString() },
      },
    });

    revalidatePath("/admin/members");
    return { success: true, message: "회원이 활성화되었습니다." };
  }

  return { success: false, message: "잘못된 액션입니다." };
}
