// ============================================================
// COSFIT - Admin Data Collection Server Actions
// KFDA Sync Management & Daily Batch Control
// ============================================================

"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { syncAllKfdaData, syncDailyKfdaUpdates } from "@/lib/kfda/full-sync";

// ── Auth Guard ──

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("관리자 권한이 필요합니다.");
  }
  return session.user as any;
}

// ── Types ──

export interface SyncHistoryItem {
  id: string;
  syncType: string;
  totalCount: number;
  processed: number;
  created: number;
  updated: number;
  errors: number;
  startedAt: string;
  completedAt: string | null;
}

export interface BatchJobStatus {
  type: string;
  enabled: boolean;
  schedule: string;
  lastRunAt: string | null;
  lastResult: any;
}

// ── Actions ──

/**
 * Start full KFDA sync with password verification
 */
export async function startFullKfdaSync(adminPassword: string) {
  const admin = await requireAdmin();

  // Verify password
  const user = await prisma.user.findUnique({
    where: { id: admin.id },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    throw new Error("비밀번호가 설정되지 않았습니다.");
  }

  const isValid = await bcrypt.compare(adminPassword, user.passwordHash);
  if (!isValid) {
    throw new Error("비밀번호가 올바르지 않습니다.");
  }

  // Start sync (non-blocking - returns immediately with initial status)
  const result = await syncAllKfdaData();

  // Update batch job lastRunAt
  await prisma.batchJob.upsert({
    where: { id: "kfda-sync-job" },
    update: { lastRunAt: new Date(), lastResult: result as any },
    create: {
      id: "kfda-sync-job",
      type: "KFDA_SYNC",
      enabled: false,
      lastRunAt: new Date(),
      lastResult: result as any,
    },
  });

  return result;
}

/**
 * Get current KFDA sync status
 */
export async function getKfdaSyncStatus() {
  await requireAdmin();

  const latestLog = await prisma.kfdaSyncLog.findFirst({
    orderBy: { startedAt: "desc" },
  });

  if (!latestLog) {
    return { status: "IDLE", lastSync: null };
  }

  return {
    status: latestLog.completedAt ? "COMPLETED" : "IN_PROGRESS",
    lastSync: {
      id: latestLog.id,
      syncType: latestLog.syncType,
      totalCount: latestLog.totalCount,
      processed: latestLog.processed,
      created: latestLog.created,
      updated: latestLog.updated,
      errors: latestLog.errors,
      startedAt: latestLog.startedAt.toISOString(),
      completedAt: latestLog.completedAt?.toISOString() ?? null,
    },
  };
}

/**
 * Get past sync history
 */
export async function getKfdaSyncHistory(): Promise<SyncHistoryItem[]> {
  await requireAdmin();

  const logs = await prisma.kfdaSyncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  return logs.map((l) => ({
    id: l.id,
    syncType: l.syncType,
    totalCount: l.totalCount,
    processed: l.processed,
    created: l.created,
    updated: l.updated,
    errors: l.errors,
    startedAt: l.startedAt.toISOString(),
    completedAt: l.completedAt?.toISOString() ?? null,
  }));
}

/**
 * Toggle daily batch ON/OFF
 */
export async function toggleDailyBatch(
  batchType: string,
  enabled: boolean
) {
  await requireAdmin();

  const jobId =
    batchType === "KFDA_SYNC" ? "kfda-sync-job" : "ingredient-knowledge-job";

  const job = await prisma.batchJob.upsert({
    where: { id: jobId },
    update: { enabled },
    create: {
      id: jobId,
      type: batchType,
      enabled,
      schedule: "0 3 * * *",
    },
  });

  return {
    type: job.type,
    enabled: job.enabled,
    schedule: job.schedule,
  };
}

/**
 * Get daily batch status for all types
 */
export async function getDailyBatchStatus(): Promise<BatchJobStatus[]> {
  await requireAdmin();

  const jobs = await prisma.batchJob.findMany({
    orderBy: { type: "asc" },
  });

  // Ensure both job types exist
  const types = ["KFDA_SYNC", "INGREDIENT_KNOWLEDGE"];
  const result: BatchJobStatus[] = [];

  for (const type of types) {
    const job = jobs.find((j) => j.type === type);
    result.push({
      type,
      enabled: job?.enabled ?? false,
      schedule: job?.schedule ?? "0 3 * * *",
      lastRunAt: job?.lastRunAt?.toISOString() ?? null,
      lastResult: job?.lastResult ?? null,
    });
  }

  return result;
}

/**
 * Trigger daily KFDA sync manually
 */
export async function triggerDailySync() {
  await requireAdmin();

  const result = await syncDailyKfdaUpdates();

  await prisma.batchJob.upsert({
    where: { id: "kfda-sync-job" },
    update: { lastRunAt: new Date(), lastResult: result as any },
    create: {
      id: "kfda-sync-job",
      type: "KFDA_SYNC",
      enabled: false,
      lastRunAt: new Date(),
      lastResult: result as any,
    },
  });

  return result;
}
