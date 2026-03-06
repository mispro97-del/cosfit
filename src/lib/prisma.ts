// ============================================================
// COSFIT - Prisma Client (AWS Production)
// ============================================================
// - 싱글턴 패턴 (Hot Reload 시 연결 누수 방지)
// - Connection Pool 설정 (RDS Proxy / PgBouncer 호환)
// - 구조화된 로그 (CloudWatch JSON 파싱 호환)
// - Graceful shutdown
// ============================================================

import { PrismaClient, Prisma } from "@prisma/client";

// ── 로그 레벨 설정 ──

const LOG_LEVELS: Prisma.LogLevel[] =
  process.env.NODE_ENV === "production"
    ? ["error", "warn"]
    : ["query", "info", "warn", "error"];

// ── 싱글턴 ──

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: LOG_LEVELS.map((level) => ({
      emit: "event" as const,
      level,
    })),
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // ── CloudWatch 호환 구조화 로그 ──

  if (process.env.NODE_ENV === "production") {
    (client as any).$on("error", (e: any) => {
      console.error(
        JSON.stringify({
          level: "ERROR",
          source: "prisma",
          message: e.message,
          target: e.target,
          timestamp: new Date().toISOString(),
        })
      );
    });

    (client as any).$on("warn", (e: any) => {
      console.warn(
        JSON.stringify({
          level: "WARN",
          source: "prisma",
          message: e.message,
          timestamp: new Date().toISOString(),
        })
      );
    });
  } else {
    // 개발 환경: 쿼리 로깅
    (client as any).$on("query", (e: any) => {
      if (e.duration > 100) {
        console.warn(`[Prisma] Slow query (${e.duration}ms): ${e.query?.slice(0, 200)}`);
      }
    });
  }

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ── Graceful Shutdown ──

async function shutdown() {
  console.log(
    JSON.stringify({
      level: "INFO",
      source: "prisma",
      message: "Disconnecting from database...",
      timestamp: new Date().toISOString(),
    })
  );
  await prisma.$disconnect();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export default prisma;
