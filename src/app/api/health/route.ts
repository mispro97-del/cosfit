import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const start = Date.now();

  let dbStatus = "ok";
  let dbLatencyMs = 0;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - start;
  } catch {
    dbStatus = "error";
    dbLatencyMs = Date.now() - start;
  }

  const status = dbStatus === "ok" ? "ok" : "degraded";

  // App Runner health check: always return 200 so the process-alive check passes.
  // DB degraded state is visible in the response body but does not fail the health check.
  return NextResponse.json(
    {
      status,
      version: process.env.npm_package_version ?? "1.0.0",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      checks: [
        {
          name: "database",
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
      ],
    },
    { status: 200 }
  );
}
