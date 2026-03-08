// ============================================================
// COSFIT - Admin ETL API Route
// POST: ETL 실행 | GET: 실행 이력 조회
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  runFullETL,
  runIngredientETL,
  runReviewETL,
  runProductQualityETL,
} from "@/lib/etl/pipeline";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return null;
  }
  return session.user;
}

// POST /api/admin/etl - ETL 실행
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const type: string = body.type || "full";

    const start = Date.now();
    let result;

    switch (type) {
      case "ingredients":
        result = await runIngredientETL();
        break;
      case "reviews":
        result = await runReviewETL();
        break;
      case "products":
        result = await runProductQualityETL();
        break;
      case "full":
      default:
        result = await runFullETL();
        break;
    }

    const durationMs = Date.now() - start;

    return NextResponse.json({
      success: true,
      type,
      result,
      durationMs,
      executedAt: new Date().toISOString(),
      executedBy: (admin as any).email || "admin",
    });
  } catch (err: any) {
    console.error("[API] ETL execution error:", err);
    return NextResponse.json(
      { error: "ETL 실행 중 오류가 발생했습니다.", details: err.message },
      { status: 500 }
    );
  }
}

// GET /api/admin/etl - ETL 실행 이력 조회
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: 403 }
    );
  }

  try {
    const logs = await prisma.dataQualityLog.findMany({
      orderBy: { checkedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      logs: logs.map((log) => ({
        id: log.id,
        entityType: log.entityType,
        totalCount: log.totalCount,
        missingRate: log.missingRate,
        details: log.details,
        checkedAt: log.checkedAt.toISOString(),
      })),
    });
  } catch (err: any) {
    console.error("[API] ETL history error:", err);
    return NextResponse.json(
      { error: "이력 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
