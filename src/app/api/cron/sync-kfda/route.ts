// ============================================================
// COSFIT - Cron: 식약처 데이터 자동 동기화
// GET /api/cron/sync-kfda
// ============================================================
// Vercel Cron / AWS EventBridge에서 매일 2:00 AM KST 호출
// Authorization: Bearer CRON_SECRET 으로 보호
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { runSyncJob } from "@/lib/kfda";

export const maxDuration = 300; // 5분 (Vercel Pro)
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // ── 인증: Cron Secret ──
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const result = await runSyncJob({
      maxPages: 5,  // Cron에서는 최근 5000건만 (증분)
      triggeredBy: "cron",
    });

    return NextResponse.json({
      success: result.status === "COMPLETED",
      data: {
        syncLogId: result.syncLogId,
        totalFetched: result.totalFetched,
        newProducts: result.newProducts,
        updatedProducts: result.updatedProducts,
        ingredientsNormalized: result.ingredientsNormalized,
        ingredientsFailed: result.ingredientsFailed,
        qualityIssues: result.qualityIssues.length,
        duration: `${(result.duration / 1000).toFixed(1)}s`,
      },
    });
  } catch (error: any) {
    console.error(JSON.stringify({
      level: "ERROR",
      source: "cron/sync-kfda",
      message: error.message,
    }));

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
