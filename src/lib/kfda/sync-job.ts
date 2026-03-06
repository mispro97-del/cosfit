// ============================================================
// COSFIT - Full Import Engine (FR-D01)
// src/lib/kfda/sync-job.ts
// ============================================================
// Phase 1: 우선순위 필터링 (TOP 브랜드 + 인기 카테고리)
// Phase 2: 식약처 API 수집 (Pagination)
// Phase 3: Bulk Upsert (createMany/transaction, 100건 배치)
// Phase 4: 성분 정규화 (IngredientNormalizer 배치)
// Phase 5: dataStatus → SUCCESS / QUALITY_ISSUE 분류
// ============================================================

import type { KfdaParsedProduct, KfdaFetchError } from "./client";
import { KfdaClient, mapCategory } from "./client";
// import prisma from "@/lib/prisma";

// ── Types ──

export interface SyncJobOptions {
  maxPages?: number;
  maxProducts?: number;        // 최대 수집 제품 수 (기본 5000)
  priorityBrands?: string[];   // 우선 수집 브랜드
  priorityCategories?: string[];
  onProgress?: (state: SyncProgress) => void;
  triggeredBy?: string;
  incrementalSince?: Date;
}

export interface SyncProgress {
  phase: "init" | "fetching" | "filtering" | "bulk_saving" | "normalizing" | "finalizing" | "done" | "error";
  processed: number;
  total: number;
  newProducts: number;
  updatedProducts: number;
  failedItems: number;
  normalizedCount: number;
  unmappedCount: number;
  message: string;
  elapsedMs: number;
}

export interface SyncJobResult {
  syncLogId: string;
  status: "COMPLETED" | "FAILED";
  totalFetched: number;
  afterFilter: number;
  newProducts: number;
  updatedProducts: number;
  skipped: number;
  ingredientsNormalized: number;
  ingredientsFailed: number;
  unmappedIngredients: UnmappedIngredient[];
  qualityIssues: QualityIssue[];
  fetchErrors: KfdaFetchError[];
  duration: number;
  dbStats: { bulkInserts: number; avgBatchMs: number };
}

export interface QualityIssue {
  reportNo: string;
  productName: string;
  issue: "NO_INGREDIENTS" | "EMPTY_NAME" | "INVALID_FORMAT" | "DUPLICATE" | "TOO_FEW_INGREDIENTS";
  detail: string;
}

export interface UnmappedIngredient {
  rawName: string;
  closestMatch: string | null;
  similarity: number;
  productCount: number;
  sampleProducts: string[];
}

// ── Priority Brands (시장 점유율 TOP) ──

const DEFAULT_PRIORITY_BRANDS = [
  "아모레퍼시픽", "LG생활건강", "에스트라", "닥터지", "토리든",
  "구달", "코스알엑스", "이니스프리", "라네즈", "설화수",
  "미샤", "더페이스샵", "네이처리퍼블릭", "에뛰드", "클리오",
  "바이오더마", "라로슈포제", "아벤느", "쏭오블사용", "달바",
  "넘버즈인", "아누아", "메디힐", "셀퓨전씨", "닥터자르트",
  "피지오겔", "세라비", "큐렐", "듀크레이", "일리윤",
  "라운드랩", "스킨푸드", "파파레시피", "마녀공장", "하루하루",
  "조선미녀", "티르티르", "VT", "CNP", "AHC",
];

const DEFAULT_PRIORITY_CATEGORIES = [
  "기초화장품", "기능성화장품", "인체 세정용",
];

// ── Bulk Insert Helpers ──

const BATCH_SIZE = 100;

interface BulkUpsertResult {
  newCount: number;
  updatedCount: number;
  skippedCount: number;
  batchCount: number;
  totalBatchMs: number;
}

async function bulkUpsertProducts(
  products: KfdaParsedProduct[],
  onBatchDone?: (done: number, total: number) => void
): Promise<BulkUpsertResult> {
  let newCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let batchCount = 0;
  let totalBatchMs = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const batchStart = Date.now();

    /*
    await prisma.$transaction(async (tx) => {
      for (const product of batch) {
        // 1. Brand upsert
        const brand = await tx.brand.upsert({
          where: { name: product.brand },
          update: { nameKo: product.brand },
          create: { name: product.brand, nameKo: product.brand },
        });

        // 2. Product upsert with dataStatus tracking
        const existing = await tx.productMaster.findUnique({
          where: { kfdaReportNo: product.reportNo },
          select: { id: true },
        });

        const hasIngredients = product.rawIngredientList.length >= 2;

        await tx.productMaster.upsert({
          where: { kfdaReportNo: product.reportNo },
          update: {
            name: product.name,
            rawIngredients: product.rawIngredients,
            ingredientCount: 0, // 정규화 후 업데이트
            dataStatus: "RAW_SAVED",
            dataSyncedAt: new Date(),
            kfdaData: {
              categoryRaw: product.categoryRaw,
              permitDate: product.permitDate,
              updateDate: product.updateDate,
              fetchedAt: new Date().toISOString(),
            },
            status: hasIngredients ? "DATA_COLLECTING" : "NORM_FAILED",
          },
          create: {
            name: product.name,
            brandId: brand.id,
            category: mapCategory(product.categoryRaw),
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
            status: hasIngredients ? "DATA_COLLECTING" : "NORM_FAILED",
          },
        });

        if (existing) updatedCount++;
        else newCount++;
      }
    }, { timeout: 30_000 }); // 배치당 30초 타임아웃
    */

    // Mock
    for (const p of batch) {
      if (Math.random() > 0.6) newCount++;
      else updatedCount++;
    }

    totalBatchMs += Date.now() - batchStart;
    batchCount++;
    onBatchDone?.(Math.min(i + BATCH_SIZE, products.length), products.length);
  }

  return { newCount, updatedCount, skippedCount, batchCount, totalBatchMs };
}

// ── Normalization Pipeline ──

async function runNormalizationPipeline(
  products: KfdaParsedProduct[],
  onProgress?: (done: number, total: number) => void
): Promise<{
  normalized: number;
  failed: number;
  unmapped: UnmappedIngredient[];
}> {
  const unmappedMap = new Map<string, { closest: string | null; sim: number; products: string[] }>();
  let normalized = 0;
  let failed = 0;

  /*
  // 1. 성분 사전 로드
  const dictionary = await prisma.ingredient.findMany({
    select: { id: true, nameInci: true, nameKo: true, casNumber: true },
  });

  const dictEntries = dictionary.map((d) => ({
    id: d.id,
    nameInci: d.nameInci,
    nameKo: d.nameKo ?? undefined,
    casNumber: d.casNumber ?? undefined,
    aliases: [],
  }));

  const normalizer = new IngredientNormalizer(dictEntries);

  // 2. 배치 정규화 (100 제품씩)
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(async (tx) => {
      for (const product of batch) {
        if (product.rawIngredientList.length === 0) continue;

        const dbProduct = await tx.productMaster.findUnique({
          where: { kfdaReportNo: product.reportNo },
          select: { id: true },
        });
        if (!dbProduct) continue;

        // 기존 연결 삭제
        await tx.productIngredient.deleteMany({
          where: { productId: dbProduct.id },
        });

        const batchResult = normalizer.normalizeBatch(
          product.rawIngredientList, "KFDA", product.name
        );

        // Bulk create (createMany)
        const createData = [];
        let resolvedCount = 0;

        for (let j = 0; j < batchResult.results.length; j++) {
          const r = batchResult.results[j];

          if (r.ingredientId) {
            createData.push({
              productId: dbProduct.id,
              ingredientId: r.ingredientId,
              orderIndex: j,
            });
            resolvedCount++;
          } else {
            // 미분류 성분: 신규 등록
            const newIng = await tx.ingredient.upsert({
              where: { nameInci: r.standardName ?? r.rawName },
              update: {},
              create: {
                nameInci: r.standardName ?? r.rawName,
                nameKo: r.rawName,
                safetyGrade: "UNKNOWN",
              },
            });

            createData.push({
              productId: dbProduct.id,
              ingredientId: newIng.id,
              orderIndex: j,
            });

            // 미분류 추적
            const key = r.rawName;
            const existing = unmappedMap.get(key);
            if (existing) {
              existing.products.push(product.name);
            } else {
              unmappedMap.set(key, {
                closest: r.standardName ?? null,
                sim: r.confidence === "HIGH" ? 0.9 : r.confidence === "MEDIUM" ? 0.7 : 0.4,
                products: [product.name],
              });
            }
            failed++;
          }
        }

        // Bulk insert
        if (createData.length > 0) {
          await tx.productIngredient.createMany({ data: createData });
          normalized += resolvedCount;
        }

        // 제품 상태 업데이트
        const hasIssues = batchResult.results.some(r => !r.ingredientId);
        await tx.productMaster.update({
          where: { id: dbProduct.id },
          data: {
            ingredientCount: batchResult.results.length,
            dataStatus: hasIssues ? "QUALITY_ISSUE" : "SUCCESS",
            status: hasIssues ? "PENDING_REVIEW" : "ACTIVE",
            normFailureLog: hasIssues
              ? batchResult.results
                  .filter(r => !r.ingredientId)
                  .map(r => ({ raw: r.rawName, match: r.standardName }))
              : undefined,
          },
        });
      }
    }, { timeout: 60_000 });

    onProgress?.(Math.min(i + BATCH_SIZE, products.length), products.length);
  }
  */

  // Mock
  const totalIngredients = products.reduce((s, p) => s + p.rawIngredientList.length, 0);
  normalized = Math.floor(totalIngredients * 0.965);
  failed = totalIngredients - normalized;

  unmappedMap.set("DL-알파토코페릴아세테이트", { closest: "Tocopheryl Acetate", sim: 0.62, products: ["아토베리어 365 크림", "시카 크림"] });
  unmappedMap.set("피이지-100스테아레이트", { closest: "PEG-100 Stearate", sim: 0.58, products: ["다이브인 세럼"] });
  unmappedMap.set("하이드로제네이티드레시틴", { closest: "Hydrogenated Lecithin", sim: 0.71, products: ["아토베리어 로션", "더마 시카 토너", "워터크림"] });
  unmappedMap.set("소르비탄세스퀴올레에이트", { closest: "Sorbitan Sesquioleate", sim: 0.55, products: ["선크림 SPF50"] });
  unmappedMap.set("에칠헥실글리세린", { closest: "Ethylhexylglycerin", sim: 0.73, products: ["비타C 세럼", "모이스처 크림", "토너 패드"] });

  onProgress?.(products.length, products.length);

  // Map → Array
  const unmapped: UnmappedIngredient[] = Array.from(unmappedMap.entries())
    .map(([raw, data]) => ({
      rawName: raw,
      closestMatch: data.closest,
      similarity: data.sim,
      productCount: data.products.length,
      sampleProducts: data.products.slice(0, 3),
    }))
    .sort((a, b) => b.productCount - a.productCount);

  return { normalized, failed, unmapped };
}

// ── Main Sync Job ──

export async function runSyncJob(options: SyncJobOptions = {}): Promise<SyncJobResult> {
  const startTime = Date.now();
  const maxProducts = options.maxProducts ?? 5000;
  const priorityBrands = options.priorityBrands ?? DEFAULT_PRIORITY_BRANDS;
  const priorityCategories = options.priorityCategories ?? DEFAULT_PRIORITY_CATEGORIES;

  const elapsed = () => Date.now() - startTime;

  const progress: SyncProgress = {
    phase: "init", processed: 0, total: 0,
    newProducts: 0, updatedProducts: 0, failedItems: 0,
    normalizedCount: 0, unmappedCount: 0,
    message: "초기화 중...", elapsedMs: 0,
  };
  const emit = () => { progress.elapsedMs = elapsed(); options.onProgress?.(progress); };

  const qualityIssues: QualityIssue[] = [];
  const syncLogId = "sync_" + Date.now();

  console.log(JSON.stringify({
    level: "INFO", source: "sync",
    message: `Full import started (max ${maxProducts}, ${priorityBrands.length} brands)`,
    syncLogId,
  }));

  try {
    // ── Phase 1: API 수집 ──
    progress.phase = "fetching";
    progress.message = "식약처 API에서 데이터 수집 중...";
    emit();

    const client = new KfdaClient();
    const fetchResult = await client.fetchAll({
      maxPages: options.maxPages ?? 20,
      onProgress: (processed, total) => {
        progress.processed = processed;
        progress.total = total;
        progress.message = `API 수집: ${processed.toLocaleString()} / ${total.toLocaleString()}`;
        emit();
      },
    });

    if (fetchResult.products.length === 0) {
      throw new Error("수집된 데이터 없음: " + fetchResult.errors.map(e => e.message).join("; "));
    }

    // ── Phase 2: 우선순위 필터링 ──
    progress.phase = "filtering";
    progress.message = "우선순위 기반 필터링 중...";
    emit();

    // 2-1. 품질 검증
    const validated: KfdaParsedProduct[] = [];
    const seen = new Set<string>();

    for (const p of fetchResult.products) {
      if (!p.name?.trim()) {
        qualityIssues.push({ reportNo: p.reportNo, productName: "(빈 이름)", issue: "EMPTY_NAME", detail: "제품명 누락" });
        continue;
      }
      if (seen.has(p.reportNo)) {
        qualityIssues.push({ reportNo: p.reportNo, productName: p.name, issue: "DUPLICATE", detail: "중복 보고번호" });
        continue;
      }
      seen.add(p.reportNo);

      if (!p.rawIngredients || p.rawIngredientList.length === 0) {
        qualityIssues.push({ reportNo: p.reportNo, productName: p.name, issue: "NO_INGREDIENTS", detail: "전성분 누락 → QUALITY_ISSUE" });
      }
      if (p.rawIngredientList.length === 1) {
        qualityIssues.push({ reportNo: p.reportNo, productName: p.name, issue: "TOO_FEW_INGREDIENTS", detail: "성분 1개 — 형식 오류 가능" });
      }

      validated.push(p);
    }

    // 2-2. 우선순위 정렬
    const scored = validated.map((p) => {
      let score = 0;
      if (priorityBrands.some((b) => p.brand.includes(b))) score += 100;
      if (priorityCategories.some((c) => p.categoryRaw.includes(c))) score += 50;
      if (p.rawIngredientList.length >= 5) score += 20;
      if (p.rawIngredientList.length >= 10) score += 10;
      return { product: p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const selected = scored.slice(0, maxProducts).map((s) => s.product);

    progress.message = `필터링 완료: ${validated.length}건 중 ${selected.length}건 선정 (브랜드 ${priorityBrands.length}개 우선)`;
    progress.total = selected.length;
    emit();

    // ── Phase 3: Bulk Upsert ──
    progress.phase = "bulk_saving";
    progress.message = "DB 적재 중 (Bulk Insert, 100건 배치)...";
    emit();

    const upsertResult = await bulkUpsertProducts(selected, (done, total) => {
      progress.processed = done;
      progress.newProducts = upsertResult?.newCount ?? 0;
      progress.updatedProducts = upsertResult?.updatedCount ?? 0;
      progress.message = `DB 적재: ${done.toLocaleString()} / ${total.toLocaleString()} (${BATCH_SIZE}건 배치)`;
      emit();
    });

    progress.newProducts = upsertResult.newCount;
    progress.updatedProducts = upsertResult.updatedCount;

    // ── Phase 4: 성분 정규화 ──
    progress.phase = "normalizing";
    progress.message = "성분 정규화 파이프라인 실행 중...";
    emit();

    const productsWithIngredients = selected.filter((p) => p.rawIngredientList.length >= 2);

    const normResult = await runNormalizationPipeline(productsWithIngredients, (done, total) => {
      progress.normalizedCount = normResult?.normalized ?? 0;
      progress.message = `정규화: ${done.toLocaleString()} / ${total.toLocaleString()} 제품 처리`;
      emit();
    });

    progress.normalizedCount = normResult.normalized;
    progress.unmappedCount = normResult.unmapped.length;

    // ── Phase 5: 상태 확정 ──
    progress.phase = "finalizing";
    progress.message = "데이터 상태 업데이트 중...";
    emit();

    /*
    // 성공 제품 → dataStatus: SUCCESS, status: ACTIVE
    await prisma.productMaster.updateMany({
      where: {
        dataStatus: "RAW_SAVED",
        ingredientCount: { gt: 0 },
        normFailureLog: null,
      },
      data: {
        dataStatus: "SUCCESS",
        status: "ACTIVE",
      },
    });

    // 인덱스 확인 (이미 schema에 정의됨)
    // @@index([name]), @@index([brandId]), @@index([status]), @@index([dataStatus])
    // PostgreSQL에서 자동 생성됨

    // Sync log 업데이트
    await prisma.dataSyncLog.update({
      where: { id: syncLogId },
      data: {
        status: "COMPLETED",
        itemsProcessed: upsertResult.newCount + upsertResult.updatedCount,
        itemsFailed: qualityIssues.length + normResult.failed,
        completedAt: new Date(),
        errorLog: {
          fetchErrors: fetchResult.errors.slice(0, 50),
          qualityIssues: qualityIssues.slice(0, 100),
          unmappedIngredients: normResult.unmapped.slice(0, 100),
          dbStats: {
            bulkInserts: upsertResult.batchCount,
            avgBatchMs: Math.round(upsertResult.totalBatchMs / Math.max(upsertResult.batchCount, 1)),
          },
        },
      },
    });
    */

    // ── Done ──
    progress.phase = "done";
    progress.message = `완료! 신규 ${upsertResult.newCount.toLocaleString()} / 업데이트 ${upsertResult.updatedCount.toLocaleString()} / 정규화 ${normResult.normalized.toLocaleString()} / 미분류 ${normResult.unmapped.length}`;
    emit();

    const result: SyncJobResult = {
      syncLogId,
      status: "COMPLETED",
      totalFetched: fetchResult.products.length,
      afterFilter: selected.length,
      newProducts: upsertResult.newCount,
      updatedProducts: upsertResult.updatedCount,
      skipped: validated.length - selected.length,
      ingredientsNormalized: normResult.normalized,
      ingredientsFailed: normResult.failed,
      unmappedIngredients: normResult.unmapped,
      qualityIssues,
      fetchErrors: fetchResult.errors,
      duration: elapsed(),
      dbStats: {
        bulkInserts: upsertResult.batchCount,
        avgBatchMs: Math.round(upsertResult.totalBatchMs / Math.max(upsertResult.batchCount, 1)),
      },
    };

    console.log(JSON.stringify({
      level: "INFO", source: "sync",
      message: "Full import completed",
      totalFetched: result.totalFetched,
      afterFilter: result.afterFilter,
      newProducts: result.newProducts,
      ingredientsNormalized: result.ingredientsNormalized,
      unmappedCount: result.unmappedIngredients.length,
      qualityIssues: result.qualityIssues.length,
      durationSec: (result.duration / 1000).toFixed(1),
    }));

    return result;
  } catch (error: any) {
    progress.phase = "error";
    progress.message = `실패: ${error.message}`;
    emit();

    console.error(JSON.stringify({
      level: "ERROR", source: "sync",
      message: error.message, syncLogId,
    }));

    return {
      syncLogId, status: "FAILED",
      totalFetched: 0, afterFilter: 0, newProducts: 0, updatedProducts: 0, skipped: 0,
      ingredientsNormalized: 0, ingredientsFailed: 0,
      unmappedIngredients: [], qualityIssues, fetchErrors: [],
      duration: elapsed(),
      dbStats: { bulkInserts: 0, avgBatchMs: 0 },
    };
  }
}
