// ============================================================
// COSFIT - KFDA Full Data Sync Module
// 식약처 전체 데이터 동기화 (전체/일일 증분)
// ============================================================

import prisma from "@/lib/prisma";
import { KfdaClient, mapCategory } from "./client";
import type { KfdaParsedProduct } from "./client";

// ── Types ──

export interface KfdaSyncResult {
  total: number;
  processed: number;
  created: number;
  updated: number;
  errors: number;
  errorDetails?: string[];
}

export interface KfdaSyncProgress {
  phase: "counting" | "fetching" | "upserting" | "done" | "error";
  processed: number;
  total: number;
  created: number;
  updated: number;
  errors: number;
  message: string;
}

// ── Constants ──

const UPSERT_BATCH_SIZE = 100;

// ── Helper: Get total count from KFDA API ──

export async function getKfdaTotalCount(): Promise<number> {
  const client = new KfdaClient();
  const url = `${process.env.KFDA_API_BASE_URL ?? "https://openapi.foodsafetykorea.go.kr/api"}/${process.env.KFDA_API_KEY}/I0030/json/1/1`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    const data = await res.json();
    return parseInt(data.I0030?.total_count ?? "0", 10);
  } catch {
    return 0;
  }
}

// ── Helper: Fetch one page of KFDA data ──

export async function fetchKfdaPage(
  page: number,
  pageSize: number = 100
): Promise<KfdaParsedProduct[]> {
  const client = new KfdaClient();
  const result = await client.fetchAll({
    maxPages: 1,
    onProgress: () => {},
  });
  return result.products.slice(0, pageSize);
}

// ── Helper: Upsert products batch ──

async function upsertProductBatch(
  products: KfdaParsedProduct[]
): Promise<{ created: number; updated: number; errors: number; errorDetails: string[] }> {
  let created = 0;
  let updated = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  for (let i = 0; i < products.length; i += UPSERT_BATCH_SIZE) {
    const batch = products.slice(i, i + UPSERT_BATCH_SIZE);

    try {
      await prisma.$transaction(
        async (tx) => {
          for (const product of batch) {
            try {
              // 1. Brand upsert
              const brand = await tx.brand.upsert({
                where: { name: product.brand },
                update: { nameKo: product.brand },
                create: { name: product.brand, nameKo: product.brand },
              });

              // 2. Check existing
              const existing = await tx.productMaster.findUnique({
                where: { kfdaReportNo: product.reportNo },
                select: { id: true },
              });

              const category = mapCategory(product.categoryRaw) as any;

              // 3. Product upsert
              await tx.productMaster.upsert({
                where: { kfdaReportNo: product.reportNo },
                update: {
                  name: product.name,
                  rawIngredients: product.rawIngredients,
                  dataStatus: "RAW_SAVED",
                  dataSyncedAt: new Date(),
                  kfdaData: {
                    categoryRaw: product.categoryRaw,
                    permitDate: product.permitDate,
                    updateDate: product.updateDate,
                    fetchedAt: new Date().toISOString(),
                  },
                },
                create: {
                  name: product.name,
                  brandId: brand.id,
                  category,
                  rawIngredients: product.rawIngredients,
                  kfdaReportNo: product.reportNo,
                  dataStatus: "RAW_SAVED",
                  dataSyncedAt: new Date(),
                  kfdaData: {
                    categoryRaw: product.categoryRaw,
                    permitDate: product.permitDate,
                    updateDate: product.updateDate,
                    fetchedAt: new Date().toISOString(),
                  },
                },
              });

              if (existing) updated++;
              else created++;
            } catch (err: any) {
              errors++;
              errorDetails.push(
                `[${product.reportNo}] ${product.name}: ${err.message}`
              );
            }
          }
        },
        { timeout: 60_000 }
      );
    } catch (err: any) {
      errors += batch.length;
      errorDetails.push(`Batch error: ${err.message}`);
    }
  }

  return { created, updated, errors, errorDetails };
}

// ── Full Sync ──

export async function syncAllKfdaData(
  onProgress?: (progress: KfdaSyncProgress) => void
): Promise<KfdaSyncResult> {
  const progress: KfdaSyncProgress = {
    phase: "counting",
    processed: 0,
    total: 0,
    created: 0,
    updated: 0,
    errors: 0,
    message: "총 건수 조회 중...",
  };
  onProgress?.(progress);

  // Create sync log
  const syncLog = await prisma.kfdaSyncLog.create({
    data: {
      syncType: "FULL",
      totalCount: 0,
      processed: 0,
      created: 0,
      updated: 0,
      errors: 0,
    },
  });

  try {
    // 1. Fetch all data
    progress.phase = "fetching";
    progress.message = "식약처 API에서 데이터 수집 중...";
    onProgress?.(progress);

    const client = new KfdaClient();
    const fetchResult = await client.fetchAll({
      onProgress: (processed, total) => {
        progress.processed = processed;
        progress.total = total;
        progress.message = `API 수집: ${processed.toLocaleString()} / ${total.toLocaleString()}`;
        onProgress?.(progress);
      },
    });

    progress.total = fetchResult.products.length;

    // Update sync log with total
    await prisma.kfdaSyncLog.update({
      where: { id: syncLog.id },
      data: { totalCount: fetchResult.totalCount },
    });

    // 2. Upsert to DB
    progress.phase = "upserting";
    progress.message = "DB 적재 중...";
    onProgress?.(progress);

    const upsertResult = await upsertProductBatch(fetchResult.products);

    // 3. Done
    progress.phase = "done";
    progress.processed = fetchResult.products.length;
    progress.created = upsertResult.created;
    progress.updated = upsertResult.updated;
    progress.errors = upsertResult.errors;
    progress.message = `완료: 신규 ${upsertResult.created} / 업데이트 ${upsertResult.updated} / 오류 ${upsertResult.errors}`;
    onProgress?.(progress);

    // Update sync log
    await prisma.kfdaSyncLog.update({
      where: { id: syncLog.id },
      data: {
        processed: fetchResult.products.length,
        created: upsertResult.created,
        updated: upsertResult.updated,
        errors: upsertResult.errors,
        completedAt: new Date(),
        details: JSON.parse(JSON.stringify({
          fetchErrors: fetchResult.errors.slice(0, 50),
          upsertErrors: upsertResult.errorDetails.slice(0, 100),
        })),
      },
    });

    return {
      total: fetchResult.totalCount,
      processed: fetchResult.products.length,
      created: upsertResult.created,
      updated: upsertResult.updated,
      errors: upsertResult.errors,
      errorDetails: upsertResult.errorDetails.slice(0, 50),
    };
  } catch (err: any) {
    // Update sync log on failure
    await prisma.kfdaSyncLog.update({
      where: { id: syncLog.id },
      data: {
        completedAt: new Date(),
        details: { error: err.message },
      },
    });

    progress.phase = "error";
    progress.message = `실패: ${err.message}`;
    onProgress?.(progress);

    return {
      total: 0,
      processed: 0,
      created: 0,
      updated: 0,
      errors: 1,
      errorDetails: [err.message],
    };
  }
}

// ── Daily Incremental Sync ──

export async function syncDailyKfdaUpdates(): Promise<KfdaSyncResult> {
  const syncLog = await prisma.kfdaSyncLog.create({
    data: {
      syncType: "DAILY",
      totalCount: 0,
      processed: 0,
      created: 0,
      updated: 0,
      errors: 0,
    },
  });

  try {
    // Fetch all and filter by updateDate within last 24h
    const client = new KfdaClient();
    const fetchResult = await client.fetchAll({ maxPages: 5 });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10).replace(/-/g, "");

    const recentProducts = fetchResult.products.filter((p) => {
      if (!p.updateDate) return false;
      return p.updateDate.replace(/-/g, "") >= yesterdayStr;
    });

    const upsertResult = await upsertProductBatch(recentProducts);

    await prisma.kfdaSyncLog.update({
      where: { id: syncLog.id },
      data: {
        totalCount: fetchResult.totalCount,
        processed: recentProducts.length,
        created: upsertResult.created,
        updated: upsertResult.updated,
        errors: upsertResult.errors,
        completedAt: new Date(),
        details: JSON.parse(JSON.stringify({
          fetchErrors: fetchResult.errors.slice(0, 20),
          upsertErrors: upsertResult.errorDetails.slice(0, 50),
          filteredFrom: fetchResult.products.length,
        })),
      },
    });

    return {
      total: fetchResult.totalCount,
      processed: recentProducts.length,
      created: upsertResult.created,
      updated: upsertResult.updated,
      errors: upsertResult.errors,
    };
  } catch (err: any) {
    await prisma.kfdaSyncLog.update({
      where: { id: syncLog.id },
      data: {
        completedAt: new Date(),
        details: { error: err.message },
      },
    });

    return {
      total: 0,
      processed: 0,
      created: 0,
      updated: 0,
      errors: 1,
      errorDetails: [err.message],
    };
  }
}
