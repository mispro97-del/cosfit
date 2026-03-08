// 테스트 계정 생성 스크립트
// 실행: npx tsx prisma/create-test-accounts.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 기존 사용자 모두 삭제
  const deleted = await prisma.user.deleteMany({});
  console.log(`🗑️ 기존 사용자 ${deleted.count}명 삭제`);

  const password = "qwer1234!@";
  const passwordHash = await bcrypt.hash(password, 12);

  // 1) ADMIN 계정
  const admin = await prisma.user.create({
    data: {
      email: "admin@cosfit.co.kr",
      passwordHash,
      name: "관리자",
      role: "ADMIN",
      onboardingStatus: "COMPLETED",
    },
  });
  console.log("✅ ADMIN:", admin.email);

  // 2) PARTNER 계정
  const partner = await prisma.user.create({
    data: {
      email: "partner@cosfit.co.kr",
      passwordHash,
      name: "입점사",
      role: "PARTNER",
      onboardingStatus: "COMPLETED",
    },
  });
  console.log("✅ PARTNER:", partner.email);

  // 3) USER 계정
  const user = await prisma.user.create({
    data: {
      email: "user@cosfit.co.kr",
      passwordHash,
      name: "사용자",
      role: "USER",
      onboardingStatus: "COMPLETED",
    },
  });
  console.log("✅ USER:", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
