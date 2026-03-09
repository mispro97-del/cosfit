// ============================================================
// COSFIT - Admin Seed Script
// Super Admin 계정 생성 (upsert 패턴 - 중복 실행 안전)
// Usage: npx tsx prisma/seed-admin.ts
// ============================================================

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// createFullPermissions 로직 인라인 (import 경로 문제 방지)
const ADMIN_MENU_KEYS = [
  "data-collection",
  "ingredients",
  "reviews",
  "data-quality",
  "etl",
  "admin-users",
  "statistics",
  "members",
  "partners",
  "commerce",
];

function createFullPermissions() {
  const menuPermissions: Record<string, { view: boolean; create: boolean; edit: boolean }> = {};
  for (const key of ADMIN_MENU_KEYS) {
    menuPermissions[key] = { view: true, create: true, edit: true };
  }
  return { menuPermissions };
}

async function main() {
  console.log("[seed-admin] Seeding Super Admin account...");

  const email = "admin@cosfit.kr";
  const password = "qwer1234!@";
  const passwordHash = await bcrypt.hash(password, 12);

  // 1. User upsert
  const user = await prisma.user.upsert({
    where: { email },
    update: {}, // 이미 존재하면 변경하지 않음
    create: {
      email,
      passwordHash,
      name: "Super Admin",
      role: "ADMIN",
      onboardingStatus: "COMPLETED",
      mustChangePassword: true,
    },
  });

  // 2. AdminUser upsert
  await prisma.adminUser.upsert({
    where: { userId: user.id },
    update: {}, // 이미 존재하면 변경하지 않음
    create: {
      userId: user.id,
      isSuperAdmin: true,
      permissions: createFullPermissions(),
    },
  });

  console.log(`[seed-admin] Super Admin created: ${email}`);
  console.log("[seed-admin] Done!");
}

main()
  .catch((e) => {
    console.error("[seed-admin] Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
