// ============================================================
// COSFIT - FR-05: FIT Score 산출 엔진 v3 (Safety-First)
// ============================================================
// v2 → v3 변경사항:
//   1. Red Flag 2배 감점 (민감성 시 최대 가중)
//   2. 성분 희소성 패턴 (인생템 공통 배제 성분 감지)
//   3. 엄격한 XAI 문구 (단호한 경고 톤)
//   4. 데이터 완결성 연동 (PARTIAL → 경고 노출)
//   5. 자극 성분 사전 20종 확장
// ============================================================

import type {
  FitScoreRequest,
  FitScoreResult,
  FitGrade,
  FitMatchGood,
  FitRisk,
  FitMissing,
  FitNovelRisk,
  FitExclusionFlag,
  UserStandardProfile,
  IngredientWithOrder,
  ExcludedIngredient,
} from "./types";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const RISK_PENALTY: Record<string, number> = { HIGH: 18, MEDIUM: 8, LOW: 3 };

function positionWeight(orderIndex: number): number {
  if (orderIndex <= 3) return 1.8;
  if (orderIndex <= 7) return 1.4;
  if (orderIndex <= 15) return 1.0;
  if (orderIndex <= 25) return 0.7;
  return 0.4;
}

const GRADE_THRESHOLDS: { min: number; grade: FitGrade }[] = [
  { min: 85, grade: "PERFECT" },
  { min: 70, grade: "GOOD" },
  { min: 50, grade: "FAIR" },
  { min: 30, grade: "POOR" },
  { min: 0, grade: "RISK" },
];

type SkinType = "DRY" | "OILY" | "COMBINATION" | "NORMAL" | "SENSITIVE";

// ── 피부 타입 시너지 (v2 유지) ──

interface SynergyEntry { nameInci: string; bonus: number; reason: string }

const SKIN_SYNERGY: Record<SkinType, SynergyEntry[]> = {
  DRY: [
    { nameInci: "ceramide np", bonus: 4, reason: "건성 피부 장벽 강화에 핵심적인 세라마이드" },
    { nameInci: "squalane", bonus: 3, reason: "건성 피부에 우수한 에몰리언트" },
    { nameInci: "shea butter", bonus: 3, reason: "깊은 보습의 시어버터" },
    { nameInci: "hyaluronic acid", bonus: 3, reason: "강력한 수분 보유" },
    { nameInci: "glycerin", bonus: 2, reason: "기본 보습제" },
    { nameInci: "panthenol", bonus: 2, reason: "장벽 회복" },
  ],
  OILY: [
    { nameInci: "niacinamide", bonus: 4, reason: "피지 조절" },
    { nameInci: "salicylic acid", bonus: 4, reason: "각질·피지 제거" },
    { nameInci: "zinc pca", bonus: 3, reason: "피지 억제" },
    { nameInci: "centella asiatica extract", bonus: 2, reason: "트러블 진정" },
  ],
  COMBINATION: [
    { nameInci: "niacinamide", bonus: 3, reason: "밸런스 조절" },
    { nameInci: "hyaluronic acid", bonus: 3, reason: "수분 공급" },
    { nameInci: "panthenol", bonus: 2, reason: "컨디션 개선" },
  ],
  NORMAL: [
    { nameInci: "tocopherol", bonus: 2, reason: "항산화 보호" },
    { nameInci: "niacinamide", bonus: 2, reason: "톤 개선" },
  ],
  SENSITIVE: [
    { nameInci: "madecassoside", bonus: 4, reason: "민감 피부 진정 최적화" },
    { nameInci: "panthenol", bonus: 4, reason: "민감 피부 장벽 회복" },
    { nameInci: "allantoin", bonus: 3, reason: "진정·재생" },
    { nameInci: "bisabolol", bonus: 3, reason: "항염" },
    { nameInci: "centella asiatica extract", bonus: 3, reason: "시카 진정" },
    { nameInci: "ceramide np", bonus: 3, reason: "손상 장벽 복원" },
    { nameInci: "beta-glucan", bonus: 2, reason: "면역 강화" },
  ],
};

// ── 20종 자극 성분 사전 (v3: 확장 + 리스크 레벨 엄격화) ──

const RED_FLAG_INGREDIENTS: Record<string, { risk: "HIGH" | "MEDIUM" | "LOW"; reason: string }> = {
  // HIGH — 즉시 경고
  "formaldehyde":              { risk: "HIGH", reason: "포름알데히드 — 발암 우려 물질로 사용 금지 권고" },
  "methylisothiazolinone":     { risk: "HIGH", reason: "MIT 방부제 — 알러지 유발 위험 매우 높음, EU 사용 제한" },
  "sodium lauryl sulfate":     { risk: "HIGH", reason: "SLS — 강한 계면활성제로 피부 장벽 손상 위험" },
  "methylchloroisothiazolinone": { risk: "HIGH", reason: "CMIT 방부제 — 심한 접촉성 피부염 유발" },
  "hydroquinone":              { risk: "HIGH", reason: "하이드로퀴논 — 장기 사용 시 피부 변색 위험" },
  // MEDIUM — 민감 피부 주의
  "fragrance":                 { risk: "MEDIUM", reason: "인공 향료 — 접촉성 피부염의 주요 원인" },
  "parfum":                    { risk: "MEDIUM", reason: "향료 — 알러지 유발 가능" },
  "alcohol denat.":            { risk: "MEDIUM", reason: "변성 알코올 — 피부 건조 유발, 장벽 약화" },
  "isopropyl alcohol":         { risk: "MEDIUM", reason: "자극성 알코올 — 피부 탈지 작용" },
  "sodium laureth sulfate":    { risk: "MEDIUM", reason: "SLES — 민감 피부 자극 가능" },
  "benzalkonium chloride":     { risk: "MEDIUM", reason: "방부제 — 피부 자극 및 알러지 보고" },
  "triclosan":                 { risk: "MEDIUM", reason: "트리클로산 — 환경호르몬 우려, 다수 국가 규제" },
  "oxybenzone":                { risk: "MEDIUM", reason: "옥시벤존 — 호르몬 교란 가능, 환경부 주의 성분" },
  // LOW — 참고 수준
  "linalool":                  { risk: "LOW", reason: "향료 알러젠 — 산화 시 자극 증가" },
  "limonene":                  { risk: "LOW", reason: "향료 알러젠 — 산화 시 자극 증가" },
  "citronellol":               { risk: "LOW", reason: "향료 알러젠" },
  "geraniol":                  { risk: "LOW", reason: "향료 알러젠" },
  "eugenol":                   { risk: "LOW", reason: "향료 알러젠" },
  "phenoxyethanol":            { risk: "LOW", reason: "방부제 — 고농도 시 자극 가능" },
  "propylparaben":             { risk: "LOW", reason: "파라벤 — 환경호르몬 논란" },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. Main Engine
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function calculateFitScore(request: FitScoreRequest): FitScoreResult {
  const startTime = performance.now();
  const {
    userStandard,
    targetProduct,
    userAllergies = [],
    skinType,
    sensitivityLevel = 3,
  } = request;
  const dataCompleteness = targetProduct.dataCompleteness ?? "FULL";
  const isSensitive = skinType === "SENSITIVE" || sensitivityLevel >= 4;

  // O(1) Maps
  const targetMap = new Map<string, IngredientWithOrder>();
  const targetNameMap = new Map<string, IngredientWithOrder>();
  for (const ing of targetProduct.ingredients) {
    targetMap.set(ing.ingredientId, ing);
    targetNameMap.set(ing.nameInci.toLowerCase(), ing);
  }

  // 인생템 성분 (신규 감지용)
  const knownIds = new Set<string>();
  for (const p of userStandard.preferredIngredients) knownIds.add(p.ingredientId);
  for (const a of userStandard.avoidIngredients) knownIds.add(a.ingredientId);

  const explanations: string[] = [];

  // Phase 1: 선호 성분 매칭
  const { matchedGood, missingPreferred, baseScore } =
    matchPreferred(userStandard, targetMap, explanations);

  // Phase 2: 리스크 감지 (민감도 × 2배 Red Flag)
  const { risks, riskPenalty } = detectRisks(
    userStandard, targetMap, userAllergies, sensitivityLevel, isSensitive, explanations
  );

  // Phase 3: 신규 위험 감지 (2배 강화)
  const { novelRisks, novelPenalty } = detectNovelRisks(
    targetMap, targetNameMap, knownIds, sensitivityLevel, isSensitive, explanations
  );

  // Phase 4: 성분 희소성 (인생템 공통 배제 패턴)
  const { exclusionFlags, exclusionPenalty } = detectExclusionPattern(
    userStandard, targetNameMap, isSensitive, explanations
  );

  // Phase 5: 보너스
  const patternBonus = calcPatternBonus(matchedGood, targetMap, userStandard, explanations);
  const skinBonus = calcSkinSynergy(targetNameMap, skinType, explanations);

  // Phase 6: 최종 점수
  const totalPenalty = riskPenalty + novelPenalty + exclusionPenalty;
  const totalBonus = patternBonus + skinBonus;
  const rawFinal = baseScore + totalBonus - totalPenalty;
  const finalScore = Math.max(0, Math.min(100, Math.round(rawFinal)));
  const grade = scoreToGrade(finalScore);
  const confidence = assessConfidence(userStandard, targetProduct.ingredients.length, dataCompleteness);

  // Data warning
  const dataWarning = dataCompleteness === "PARTIAL"
    ? "⚠️ 이 제품은 전성분 정보가 일부 누락되어 분석 정확도가 제한됩니다. 표시된 점수는 확보된 성분만을 기반으로 산출되었습니다."
    : null;

  if (dataWarning) {
    explanations.push(dataWarning);
  }

  // Summary
  const summary = generateSummary(
    finalScore, grade, matchedGood, risks, novelRisks, exclusionFlags,
    missingPreferred, targetProduct.name, isSensitive, confidence, dataCompleteness
  );

  return {
    score: finalScore,
    grade,
    reasons: matchedGood,
    risks,
    missing: missingPreferred,
    novelRisks,
    exclusionFlags,
    summary,
    explanations,
    dataWarning,
    breakdown: {
      baseScore: r1(baseScore),
      riskPenalty: r1(riskPenalty),
      bonusScore: r1(patternBonus),
      skinSynergyBonus: r1(skinBonus),
      novelRiskPenalty: r1(novelPenalty),
      exclusionPenalty: r1(exclusionPenalty),
      finalScore,
    },
    confidence,
    metadata: {
      analysisModel: "cosfit-v3-safety-first",
      processingTimeMs: Math.round(performance.now() - startTime),
      ingredientsCovered: matchedGood.length,
      totalProductIngredients: targetProduct.ingredients.length,
      coverageRatio: targetProduct.ingredients.length > 0
        ? r2(matchedGood.length / targetProduct.ingredients.length) : 0,
    },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Phase 1: 선호 성분 매칭
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function matchPreferred(
  standard: UserStandardProfile,
  targetMap: Map<string, IngredientWithOrder>,
  xai: string[]
): { matchedGood: FitMatchGood[]; missingPreferred: FitMissing[]; baseScore: number } {
  const matchedGood: FitMatchGood[] = [];
  const missingPreferred: FitMissing[] = [];
  let weightedMatch = 0, totalWeight = 0;

  for (const pref of standard.preferredIngredients) {
    totalWeight += pref.weight;
    const found = targetMap.get(pref.ingredientId);

    if (found) {
      const pw = positionWeight(found.orderIndex);
      weightedMatch += pref.weight * pw;
      const posLabel = found.orderIndex <= 3 ? "핵심 함량" : found.orderIndex <= 7 ? "상위 함량" : found.orderIndex <= 15 ? "중간 함량" : "소량";
      matchedGood.push({
        ingredientId: pref.ingredientId, nameInci: pref.nameInci, nameKo: pref.nameKo,
        reason: `선호 성분 (${posLabel}, ${found.orderIndex}번째) — ${pref.reason}`,
        impactScore: r1(pref.weight * pw), positionInProduct: found.orderIndex,
      });
    } else {
      const imp: FitMissing["importance"] = pref.weight >= 0.6 ? "HIGH" : pref.weight >= 0.3 ? "MEDIUM" : "LOW";
      if (imp !== "LOW") {
        missingPreferred.push({ ingredientId: pref.ingredientId, nameInci: pref.nameInci, nameKo: pref.nameKo, importance: imp, weight: pref.weight });
      }
    }
  }

  const ratio = totalWeight > 0 ? weightedMatch / totalWeight : 0;
  const baseScore = totalWeight > 0 ? Math.pow(ratio, 0.85) * 100 : 50;

  if (matchedGood.length > 0) {
    const top = matchedGood.slice(0, 3).map(m => m.nameKo ?? m.nameInci).join(", ");
    xai.push(`당신의 인생템 ${standard.basedOnProductCount}개에서 공통 발견된 ${top} 등 ${matchedGood.length}개 선호 성분이 포함되어 있습니다.`);
  }
  if (missingPreferred.filter(m => m.importance === "HIGH").length > 0) {
    const miss = missingPreferred.filter(m => m.importance === "HIGH").map(m => m.nameKo ?? m.nameInci).join(", ");
    xai.push(`핵심 선호 성분 ${miss}이(가) 이 제품에 없어 점수가 하락했습니다.`);
  }

  matchedGood.sort((a, b) => b.impactScore - a.impactScore);
  return { matchedGood, missingPreferred, baseScore };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Phase 2: 리스크 감지 (Safety-First 2배)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectRisks(
  standard: UserStandardProfile,
  targetMap: Map<string, IngredientWithOrder>,
  userAllergies: string[],
  sensitivityLevel: number,
  isSensitive: boolean,
  xai: string[]
): { risks: FitRisk[]; riskPenalty: number } {
  const risks: FitRisk[] = [];
  let riskPenalty = 0;

  // v3: 민감성 승수 강화 (기존 max 1.6 → max 2.0)
  const sensMultiplier = isSensitive
    ? 1.6 + (sensitivityLevel - 3) * 0.2  // 감도4=1.8, 감도5=2.0
    : 0.4 + (sensitivityLevel / 5) * 1.0;

  const allergySet = new Set(userAllergies.map(a => a.toLowerCase()));

  // ① Standard 주의 성분 — v3: RED FLAG 2배 강화
  for (const avoid of standard.avoidIngredients) {
    const found = targetMap.get(avoid.ingredientId);
    if (!found) continue;

    const basePen = RISK_PENALTY[avoid.riskLevel] ?? 5;
    const pw = positionWeight(found.orderIndex);

    // v3: Red Flag 성분은 2배 감점
    const isRedFlag = RED_FLAG_INGREDIENTS[avoid.nameInci.toLowerCase()];
    const redFlagMultiplier = isRedFlag ? 2.0 : 1.0;

    const adjusted = basePen * pw * sensMultiplier * redFlagMultiplier;
    riskPenalty += adjusted;

    const severity = avoid.riskLevel === "HIGH" || isRedFlag
      ? "피부 자극 리스크가 높습니다"
      : "주의가 필요합니다";

    risks.push({
      ingredientId: avoid.ingredientId,
      nameInci: avoid.nameInci, nameKo: avoid.nameKo,
      riskLevel: avoid.riskLevel,
      reason: `인생템에는 없던 주의 성분 ${avoid.nameKo ?? avoid.nameInci}이(가) 포함되어 ${severity}. ${avoid.reason} (${found.orderIndex}번째 성분` +
        (found.orderIndex <= 5 ? ", 상위 함량으로 영향 큼" : "") +
        (isSensitive ? ", 민감성 피부 가중 감점 적용" : "") + ")",
      penaltyScore: r1(adjusted),
      source: avoid.source,
    });
  }

  // ② 알러지 성분
  const flagged = new Set(risks.map(r => r.ingredientId));
  for (const [id, ing] of targetMap) {
    if (flagged.has(id)) continue;
    const nameLC = ing.nameInci.toLowerCase();
    const isAllergen = allergySet.has(nameLC) || allergySet.has((ing.nameKo ?? "").toLowerCase()) || ing.commonAllergen;

    if (isAllergen) {
      const penalty = RISK_PENALTY.HIGH * sensMultiplier * 2.0; // v3: 알러지 2배
      riskPenalty += penalty;
      risks.push({
        ingredientId: id, nameInci: ing.nameInci, nameKo: ing.nameKo ?? null,
        riskLevel: "HIGH",
        reason: `⛔ 알러지 유발 성분 ${ing.nameKo ?? ing.nameInci}이(가) 포함되어 피부 자극 리스크가 높습니다.` +
          (isSensitive ? " 민감성 피부에 사용을 권장하지 않습니다." : " 패치 테스트를 반드시 실시하세요."),
        penaltyScore: r1(penalty),
        source: ing.commonAllergen ? "ALLERGEN" : "USER_ALLERGY",
      });
    }
  }

  // XAI
  const highRisks = risks.filter(r => r.riskLevel === "HIGH");
  if (highRisks.length > 0) {
    const names = highRisks.map(r => r.nameKo ?? r.nameInci).join(", ");
    xai.push(
      isSensitive
        ? `🚨 ${names}은(는) 민감성 피부에 자극을 유발할 수 있는 성분입니다. 사용을 권장하지 않습니다.`
        : `⚠️ ${names}은(는) 주의 성분으로, 패치 테스트 후 사용을 권장합니다.`
    );
  }

  risks.sort((a, b) => b.penaltyScore - a.penaltyScore);
  return { risks, riskPenalty };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Phase 3: 신규 위험 성분 (2배 Red Flag)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectNovelRisks(
  targetMap: Map<string, IngredientWithOrder>,
  targetNameMap: Map<string, IngredientWithOrder>,
  knownIds: Set<string>,
  sensitivityLevel: number,
  isSensitive: boolean,
  xai: string[]
): { novelRisks: FitNovelRisk[]; novelPenalty: number } {
  const novelRisks: FitNovelRisk[] = [];
  let novelPenalty = 0;

  for (const [id, ing] of targetMap) {
    if (knownIds.has(id)) continue;

    const nameLC = ing.nameInci.toLowerCase();
    const redFlag = RED_FLAG_INGREDIENTS[nameLC];

    if (redFlag) {
      // v3: Red Flag 2배 기본감점, 민감성 추가 1.5배
      const basePen = redFlag.risk === "HIGH" ? 12 : redFlag.risk === "MEDIUM" ? 6 : 2;
      const pen = basePen * (isSensitive ? 1.5 : 1.0);
      novelPenalty += pen;

      novelRisks.push({
        ingredientId: id, nameInci: ing.nameInci, nameKo: ing.nameKo ?? null,
        reason: `인생템에는 없던 주의 성분 ${ing.nameKo ?? ing.nameInci}이(가) 포함되어 피부 자극 리스크가 높습니다. ${redFlag.reason}`,
        safetyGrade: redFlag.risk,
        positionInProduct: ing.orderIndex,
      });
    } else if (ing.safetyGrade === "CAUTION" || ing.safetyGrade === "HAZARDOUS") {
      novelPenalty += isSensitive ? 8 : 4;
      novelRisks.push({
        ingredientId: id, nameInci: ing.nameInci, nameKo: ing.nameKo ?? null,
        reason: `인생템에는 없던 ${ing.nameKo ?? ing.nameInci}이(가) 포함 (안전등급: ${ing.safetyGrade}). 처음 사용 시 반드시 패치 테스트하세요.`,
        safetyGrade: ing.safetyGrade,
        positionInProduct: ing.orderIndex,
      });
    }
  }

  novelRisks.sort((a, b) => a.positionInProduct - b.positionInProduct);
  novelPenalty = Math.min(30, novelPenalty); // v3: 상한 30 (기존 15)

  if (novelRisks.length > 0) {
    const names = novelRisks.slice(0, 3).map(n => n.nameKo ?? n.nameInci).join(", ");
    xai.push(
      `🔍 인생템에는 없던 주의 성분 ${names}` +
      (novelRisks.length > 3 ? ` 외 ${novelRisks.length - 3}건` : "") +
      `이(가) 새로 포함되어 있습니다.` +
      (isSensitive ? " 민감성 피부에는 사용을 재고해 주세요." : " 처음 사용 시 주의하세요.")
    );
  }

  return { novelRisks, novelPenalty };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Phase 4: 성분 희소성 패턴 (인생템 공통 배제)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectExclusionPattern(
  standard: UserStandardProfile,
  targetNameMap: Map<string, IngredientWithOrder>,
  isSensitive: boolean,
  xai: string[]
): { exclusionFlags: FitExclusionFlag[]; exclusionPenalty: number } {
  const exclusionFlags: FitExclusionFlag[] = [];
  let exclusionPenalty = 0;

  const excluded = standard.excludedIngredients ?? [];
  if (excluded.length === 0 || standard.basedOnProductCount < 2) {
    return { exclusionFlags, exclusionPenalty };
  }

  for (const ex of excluded) {
    const found = targetNameMap.get(ex.nameInci.toLowerCase());
    if (!found) continue;

    // 인생템 전체에서 빠져있던 성분이 이 제품에 포함됨
    const exclusionRatio = ex.excludedFromCount / standard.basedOnProductCount;

    if (exclusionRatio < 0.8) continue; // 80% 이상 배제된 경우만

    // 감점: 배제 비율 × 위치 × 자극 위험도
    const irritantPen = ex.irritantRisk === "HIGH" ? 12 : ex.irritantRisk === "MEDIUM" ? 7 : 3;
    const pen = irritantPen * positionWeight(found.orderIndex) * (isSensitive ? 1.5 : 1.0);
    exclusionPenalty += pen;

    exclusionFlags.push({
      ingredientId: found.ingredientId,
      nameInci: ex.nameInci,
      nameKo: ex.nameKo ?? null,
      reason: `당신의 인생템 ${ex.excludedFromCount}/${standard.basedOnProductCount}개에 포함되지 않았던 ${ex.nameKo ?? ex.nameInci}이(가) 이 제품에는 포함되어 있습니다. 이는 당신의 피부가 이 성분을 피해왔을 가능성을 시사하며, 잠재적 부적합 성분으로 판단됩니다.`,
      excludedFromCount: ex.excludedFromCount,
      totalHolyGrails: standard.basedOnProductCount,
      penaltyScore: r1(pen),
      positionInProduct: found.orderIndex,
    });
  }

  exclusionPenalty = Math.min(25, exclusionPenalty);

  if (exclusionFlags.length > 0) {
    const names = exclusionFlags.map(f => f.nameKo ?? f.nameInci).join(", ");
    xai.push(
      `⛔ ${names}은(는) 당신의 인생템 모두에서 공통적으로 배제된 성분입니다. ` +
      `피부가 이 성분을 기피하는 패턴이 감지되었으며, 사용 시 주의가 필요합니다.`
    );
  }

  return { exclusionFlags, exclusionPenalty };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Phase 5: Bonus
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function calcPatternBonus(mg: FitMatchGood[], tm: Map<string, IngredientWithOrder>, std: UserStandardProfile, xai: string[]): number {
  let bonus = mg.filter(m => m.positionInProduct <= 5).length * 2.5;
  for (const p of std.detectedPatterns) {
    let mc = 0;
    for (const n of p.matchedIngredients) { for (const [, i] of tm) { if (i.nameInci.toLowerCase() === n.toLowerCase()) { mc++; break; } } }
    if (mc >= 2) { const b = Math.round(p.confidence * 4); bonus += b; xai.push(`'${p.nameKo}' 패턴 일치: +${b}점`); }
  }
  return Math.min(15, bonus);
}

function calcSkinSynergy(tnm: Map<string, IngredientWithOrder>, st: SkinType | undefined, xai: string[]): number {
  if (!st || !SKIN_SYNERGY[st]) return 0;
  let bonus = 0; const matched: string[] = [];
  for (const s of SKIN_SYNERGY[st]) { const f = tnm.get(s.nameInci.toLowerCase()); if (f) { bonus += s.bonus * positionWeight(f.orderIndex) * 0.5; matched.push(s.nameInci); } }
  bonus = Math.min(12, bonus);
  if (matched.length > 0 && bonus >= 2) {
    const L: Record<SkinType, string> = { DRY: "건성", OILY: "지성", COMBINATION: "복합성", NORMAL: "중성", SENSITIVE: "민감성" };
    xai.push(`${L[st]} 피부에 도움이 되는 ${matched.slice(0, 3).join(", ")} 등 포함: +${r1(bonus)}점`);
  }
  return bonus;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Confidence
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function assessConfidence(std: UserStandardProfile, ingCount: number, completeness: string): "HIGH" | "MEDIUM" | "LOW" {
  if (completeness === "PARTIAL") return "LOW";
  if (std.basedOnProductCount < 2 || std.preferredIngredients.length < 3 || ingCount < 3) return "LOW";
  if (std.basedOnProductCount >= 4 && std.preferredIngredients.length >= 8) return "HIGH";
  return "MEDIUM";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Summary (v3: 엄격한 톤)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const GM: Record<FitGrade, string> = {
  PERFECT: "이 제품은 당신의 피부와 최고의 궁합이에요!",
  GOOD: "전반적으로 잘 맞는 제품이에요.",
  FAIR: "일부 주의 요소가 있어요. 성분을 확인해주세요.",
  POOR: "⚠️ 주의 성분이 다수 포함되어 있습니다. 신중하게 결정하세요.",
  RISK: "🚨 이 제품은 피부에 맞지 않을 가능성이 높습니다. 사용을 권장하지 않습니다.",
};

function generateSummary(
  score: number, grade: FitGrade,
  mg: FitMatchGood[], risks: FitRisk[], nr: FitNovelRisk[], ef: FitExclusionFlag[],
  miss: FitMissing[], name: string,
  isSensitive: boolean, confidence: string, completeness: string
): string {
  const p: string[] = [];
  p.push(`'${name}'의 FIT Score는 ${score}점 (${grade})이에요. ${GM[grade]}`);

  if (mg.length > 0) {
    p.push(`선호 성분 ${mg.length}개 매칭: ${mg.slice(0, 3).map(g => g.nameKo ?? g.nameInci).join(", ")}.`);
  }

  const hr = risks.filter(r => r.riskLevel === "HIGH");
  if (hr.length > 0) {
    p.push(`🚨 주의 성분 경고: ${hr.map(r => r.nameKo ?? r.nameInci).join(", ")}.` +
      (isSensitive ? " 민감성 피부에는 사용을 권장하지 않습니다." : " 패치 테스트를 반드시 실시하세요."));
  }

  if (nr.length > 0) {
    p.push(`인생템에는 없던 주의 성분 ${nr.length}개가 새로 감지되었습니다.`);
  }

  if (ef.length > 0) {
    p.push(`⛔ 인생템 전체에서 공통 배제된 성분 ${ef.map(f => f.nameKo ?? f.nameInci).join(", ")}이(가) 포함되어 있어 부적합 가능성이 높습니다.`);
  }

  if (completeness === "PARTIAL") {
    p.push("⚠️ 이 제품은 전성분 정보가 일부 누락되어 분석이 제한됩니다.");
  }

  if (confidence === "LOW") {
    p.push("ℹ️ 인생템을 추가 등록하면 분석 정확도가 높아집니다.");
  }

  return p.join(" ");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Utils
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function scoreToGrade(s: number): FitGrade {
  for (const t of GRADE_THRESHOLDS) if (s >= t.min) return t.grade;
  return "RISK";
}

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
