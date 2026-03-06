// ============================================================
// COSFIT - Admin Sync API
// POST /api/v1/admin/sync    → 수집 시작
// GET  /api/v1/admin/sync    → 현재 진행 상태 조회
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { runSyncJob } from "@/lib/kfda";
import type { SyncProgress, SyncJobResult } from "@/lib/kfda";

// ── In-Memory State (단일 인스턴스용, 프로덕션에서는 Redis) ──

let currentSync: {
  isRunning: boolean;
  progress: SyncProgress | null;
  result: SyncJobResult | null;
  startedAt: string | null;
} = {
  isRunning: false,
  progress: null,
  result: null,
  startedAt: null,
};

// ── POST: 수집 시작 ──

export async function POST(request: NextRequest) {
  if (currentSync.isRunning) {
    return NextResponse.json(
      { success: false, error: "이미 동기화가 진행 중입니다.", progress: currentSync.progress },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const maxPages = body.maxPages ?? 3;

  currentSync = {
    isRunning: true,
    progress: { phase: "fetching", processed: 0, total: 0, newProducts: 0, updatedProducts: 0, failedItems: 0, normalizedCount: 0, unmappedCount: 0, elapsedMs: 0, message: "시작..." },
    result: null,
    startedAt: new Date().toISOString(),
  };

  // 비동기 실행 (응답은 즉시 반환)
  runSyncJob({
    maxPages,
    triggeredBy: body.triggeredBy ?? "admin",
    onProgress: (state) => {
      currentSync.progress = state;
    },
  })
    .then((result) => {
      currentSync.result = result;
      currentSync.isRunning = false;
    })
    .catch((error) => {
      currentSync.progress = {
        phase: "error",
        processed: 0,
        total: 0,
        newProducts: 0,
        updatedProducts: 0,
        failedItems: 0,
        normalizedCount: 0,
        unmappedCount: 0,
        elapsedMs: 0,
        message: error.message,
      };
      currentSync.isRunning = false;
    });

  return NextResponse.json({
    success: true,
    data: { message: "동기화가 시작되었습니다.", startedAt: currentSync.startedAt },
  });
}

// ── GET: 진행 상태 조회 ──

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      isRunning: currentSync.isRunning,
      progress: currentSync.progress,
      result: currentSync.result
        ? {
            status: currentSync.result.status,
            totalFetched: currentSync.result.totalFetched,
            newProducts: currentSync.result.newProducts,
            updatedProducts: currentSync.result.updatedProducts,
            ingredientsNormalized: currentSync.result.ingredientsNormalized,
            ingredientsFailed: currentSync.result.ingredientsFailed,
            qualityIssues: currentSync.result.qualityIssues.length,
            fetchErrors: currentSync.result.fetchErrors.length,
            duration: currentSync.result.duration,
          }
        : null,
      startedAt: currentSync.startedAt,
    },
  });
}
