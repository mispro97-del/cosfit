// ============================================================
// COSFIT - Admin Statistics/Reports Server Actions
// ============================================================

"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ── Auth Guard ──

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("관리자 권한이 필요합니다.");
  }
  return session.user;
}

// ── Helpers ──

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), diff));
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}

// ── 1. User Statistics ──

export interface UserStats {
  totalUsers: number;
  todaySignups: number;
  weekSignups: number;
  monthSignups: number;
  yearSignups: number;
  todayLogins: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  signupTrend: { date: string; count: number }[];
}

export async function getUserStats(): Promise<UserStats> {
  await requireAdmin();

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    todaySignups,
    weekSignups,
    monthSignups,
    yearSignups,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { role: "USER", createdAt: { gte: todayStart } } }),
    prisma.user.count({ where: { role: "USER", createdAt: { gte: weekStart } } }),
    prisma.user.count({ where: { role: "USER", createdAt: { gte: monthStart } } }),
    prisma.user.count({ where: { role: "USER", createdAt: { gte: yearStart } } }),
  ]);

  // Login stats - use Session table to estimate active users
  const [todayLogins, weeklyActiveUsers, monthlyActiveUsers] = await Promise.all([
    prisma.session.count({
      where: { expires: { gte: todayStart } },
    }).then(c => Math.min(c, totalUsers)),
    prisma.session.count({
      where: { expires: { gte: sevenDaysAgo } },
    }).then(async (c) => {
      // Count distinct users with sessions in the last 7 days
      const sessions = await prisma.session.findMany({
        where: { expires: { gte: sevenDaysAgo } },
        select: { userId: true },
        distinct: ["userId"],
      });
      return sessions.length;
    }),
    prisma.session.findMany({
      where: { expires: { gte: thirtyDaysAgo } },
      select: { userId: true },
      distinct: ["userId"],
    }).then(s => s.length),
  ]);

  // Signup trend: daily signups for last 30 days
  const signupTrend: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    dayStart.setHours(0, 0, 0, 0);
    dayEnd.setHours(0, 0, 0, 0);

    const count = await prisma.user.count({
      where: {
        role: "USER",
        createdAt: { gte: dayStart, lt: dayEnd },
      },
    });

    signupTrend.push({
      date: dayStart.toISOString().slice(0, 10),
      count,
    });
  }

  return {
    totalUsers,
    todaySignups,
    weekSignups,
    monthSignups,
    yearSignups,
    todayLogins,
    weeklyActiveUsers,
    monthlyActiveUsers,
    signupTrend,
  };
}

// ── 2. Service Usage Statistics ──

export interface ServiceUsageStats {
  compareCount: number;
  onboardingCompleted: number;
  orderCount: number;
  routineAnalysisCount: number;
  userProductCount: number;
  recommendationCount: number;
  reviewCount: number;
}

export async function getServiceUsageStats(): Promise<ServiceUsageStats> {
  await requireAdmin();

  const [
    compareCount,
    onboardingCompleted,
    orderCount,
    routineAnalysisCount,
    userProductCount,
    recommendationCount,
    reviewCount,
  ] = await Promise.all([
    prisma.compareResult.count(),
    prisma.user.count({ where: { onboardingStatus: "COMPLETED" } }),
    prisma.order.count(),
    prisma.routineAnalysis.count(),
    prisma.userProduct.count(),
    prisma.productRecommendation.count(),
    prisma.review.count(),
  ]);

  return {
    compareCount,
    onboardingCompleted,
    orderCount,
    routineAnalysisCount,
    userProductCount,
    recommendationCount,
    reviewCount,
  };
}

// ── 3. Churn / Retention Statistics ──

export interface ChurnStats {
  inactive7d: number;
  inactive30d: number;
  inactive90d: number;
  totalActive: number;
  retentionRate: number; // % users who returned within 7 days
}

export async function getChurnStats(): Promise<ChurnStats> {
  await requireAdmin();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const totalUsers = await prisma.user.count({ where: { role: "USER" } });

  // Users with recent sessions = active
  const activeUserIds = await prisma.session.findMany({
    where: { expires: { gte: sevenDaysAgo } },
    select: { userId: true },
    distinct: ["userId"],
  });
  const activeSet = new Set(activeUserIds.map(s => s.userId));

  // Users with sessions in last 30 days
  const active30dIds = await prisma.session.findMany({
    where: { expires: { gte: thirtyDaysAgo } },
    select: { userId: true },
    distinct: ["userId"],
  });
  const active30dSet = new Set(active30dIds.map(s => s.userId));

  // Users with sessions in last 90 days
  const active90dIds = await prisma.session.findMany({
    where: { expires: { gte: ninetyDaysAgo } },
    select: { userId: true },
    distinct: ["userId"],
  });
  const active90dSet = new Set(active90dIds.map(s => s.userId));

  const inactive7d = totalUsers - activeSet.size;
  const inactive30d = totalUsers - active30dSet.size;
  const inactive90d = totalUsers - active90dSet.size;

  // Retention rate: users who signed up > 7 days ago and have been active in last 7 days
  const usersOlderThan7d = await prisma.user.count({
    where: {
      role: "USER",
      createdAt: { lt: sevenDaysAgo },
    },
  });

  const retentionRate = usersOlderThan7d > 0
    ? Math.round((activeSet.size / usersOlderThan7d) * 100)
    : 0;

  return {
    inactive7d,
    inactive30d,
    inactive90d,
    totalActive: activeSet.size,
    retentionRate: Math.min(retentionRate, 100),
  };
}

// ── 4. Long Inactive Users ──

export interface InactiveUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  lastSessionExpires: string | null;
}

export async function getLongInactiveUsers(days: number = 30): Promise<InactiveUser[]> {
  await requireAdmin();

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Get users whose latest session expired before cutoff (or have no session)
  const users = await prisma.user.findMany({
    where: {
      role: "USER",
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      sessions: {
        orderBy: { expires: "desc" },
        take: 1,
        select: { expires: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const inactive = users
    .filter((u) => {
      if (u.sessions.length === 0) return true;
      return u.sessions[0].expires < cutoff;
    })
    .slice(0, 50);

  return inactive.map((u) => {
    // Mask personal info for statistics overview
    const maskedName = u.name
      ? u.name[0] + "*".repeat(Math.max(u.name.length - 1, 1))
      : "미설정";
    const emailParts = u.email.split("@");
    const maskedEmail =
      emailParts[0].slice(0, 2) + "***@" + emailParts[1];

    return {
      id: u.id,
      name: maskedName,
      email: maskedEmail,
      createdAt: u.createdAt.toISOString().slice(0, 10),
      lastSessionExpires: u.sessions[0]?.expires.toISOString().slice(0, 10) ?? null,
    };
  });
}
