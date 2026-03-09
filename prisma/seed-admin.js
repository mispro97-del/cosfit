// ============================================================
// COSFIT - Admin Seed Script (Plain JS for Docker runtime)
// Super Admin 계정 생성 (upsert 패턴 - 중복 실행 안전)
// Usage: node prisma/seed-admin.js
// ============================================================

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

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
  const menuPermissions = {};
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
    update: {},
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
    update: {},
    create: {
      userId: user.id,
      isSuperAdmin: true,
      permissions: createFullPermissions(),
    },
  });

  console.log("[seed-admin] Super Admin created: " + email);
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
