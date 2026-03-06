// ============================================================
// COSFIT - FIT Score v3 (Safety-First) 검증 + v2 비교
// npx tsx src/lib/analysis/__tests__/fit-score-v3.test.ts
// ============================================================

import { calculateFitScore } from "../fit-score";
import type { FitScoreRequest, FitScoreResult, UserStandardProfile, IngredientWithOrder } from "../types";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Products
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ing(id: string, n: string, ko: string, o: number, extra?: Partial<IngredientWithOrder>): IngredientWithOrder {
  return { ingredientId: id, nameInci: n, nameKo: ko, orderIndex: o, ...extra };
}

const ATOBARRIER = {
  productId: "p1", name: "에스트라 아토베리어 365 크림", category: "CREAM",
  ingredients: [
    ing("i01","Water","정제수",1), ing("i02","Glycerin","글리세린",2), ing("i03","Panthenol","판테놀",3),
    ing("i04","Madecassoside","마데카소사이드",4), ing("i05","Ceramide NP","세라마이드 NP",5),
    ing("i06","Squalane","스쿠알란",6), ing("i08","Beta-Glucan","베타글루칸",7),
    ing("i09","Allantoin","알란토인",8), ing("i10","Tocopherol","토코페롤",9),
  ],
};

const AHC_SUN = {
  productId: "p5", name: "AHC 선크림 SPF50+", category: "SUNSCREEN",
  ingredients: [
    ing("i01","Water","정제수",1), ing("i28","Alcohol Denat.","변성 알코올",2),
    ing("i29","Ethylhexyl Methoxycinnamate","에칠헥실메톡시신나메이트",3),
    ing("i02","Glycerin","글리세린",4), ing("i24","Niacinamide","나이아신아마이드",5),
    ing("i26","Fragrance","향료",6), ing("i31","Linalool","리날룰",7,{commonAllergen:true}),
    ing("i32","Limonene","리모넨",8,{commonAllergen:true}), ing("i27","Phenoxyethanol","페녹시에탄올",9),
    ing("i33","Oxybenzone","옥시벤존",10),
  ],
};

const INNISFREE_RETINOL = {
  productId: "p4", name: "이니스프리 레티놀 시카", category: "SERUM",
  ingredients: [
    ing("i01","Water","정제수",1), ing("i23","Retinol","레티놀",2), ing("i04","Madecassoside","마데카소사이드",3),
    ing("i24","Niacinamide","나이아신아마이드",4), ing("i02","Glycerin","글리세린",5),
    ing("i26","Fragrance","향료",6), ing("i27","Phenoxyethanol","페녹시에탄올",7),
  ],
};

// PARTIAL 데이터 제품 (전성분 일부 누락)
const PARTIAL_PRODUCT = {
  productId: "p_partial", name: "성분 미확인 크림 X", category: "CREAM",
  ingredients: [ ing("i02","Glycerin","글리세린",1), ing("i03","Panthenol","판테놀",2) ],
  dataCompleteness: "PARTIAL" as const,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// User Profile: 건성·민감 (인생템 2개, 공통 배제 패턴 포함)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PROFILE_SENSITIVE: UserStandardProfile = {
  preferredIngredients: [
    { ingredientId: "i03", nameInci: "Panthenol", nameKo: "판테놀", weight: 0.9, frequency: 2, avgPosition: 4, reason: "인생템 2개 공통", functions: ["moisturizer"] },
    { ingredientId: "i02", nameInci: "Glycerin", nameKo: "글리세린", weight: 0.85, frequency: 2, avgPosition: 3, reason: "기본 보습제", functions: ["humectant"] },
    { ingredientId: "i04", nameInci: "Madecassoside", nameKo: "마데카소사이드", weight: 0.8, frequency: 1, avgPosition: 4, reason: "진정 핵심", functions: ["soothing"] },
    { ingredientId: "i05", nameInci: "Ceramide NP", nameKo: "세라마이드 NP", weight: 0.75, frequency: 1, avgPosition: 5, reason: "장벽 강화", functions: ["barrier"] },
    { ingredientId: "i15", nameInci: "Hyaluronic Acid", nameKo: "히알루론산", weight: 0.7, frequency: 1, avgPosition: 2, reason: "수분 보유", functions: ["humectant"] },
    { ingredientId: "i08", nameInci: "Beta-Glucan", nameKo: "베타글루칸", weight: 0.5, frequency: 2, avgPosition: 7.5, reason: "면역 강화", functions: ["soothing"] },
    { ingredientId: "i06", nameInci: "Squalane", nameKo: "스쿠알란", weight: 0.5, frequency: 1, avgPosition: 6, reason: "에몰리언트", functions: ["emollient"] },
  ],
  avoidIngredients: [
    { ingredientId: "i26", nameInci: "Fragrance", nameKo: "향료", riskLevel: "MEDIUM", reason: "민감 피부 자극 유발", source: "SAFETY_GRADE" },
    { ingredientId: "i28", nameInci: "Alcohol Denat.", nameKo: "변성 알코올", riskLevel: "MEDIUM", reason: "피부 건조·장벽 약화", source: "EWG" },
  ],
  // v3: 인생템 공통 배제 성분 패턴
  excludedIngredients: [
    { nameInci: "Fragrance", nameKo: "향료", excludedFromCount: 2, irritantRisk: "MEDIUM" },
    { nameInci: "Alcohol Denat.", nameKo: "변성 알코올", excludedFromCount: 2, irritantRisk: "MEDIUM" },
    { nameInci: "Oxybenzone", nameKo: "옥시벤존", excludedFromCount: 2, irritantRisk: "MEDIUM" },
    { nameInci: "Sodium Lauryl Sulfate", nameKo: "소듐라우릴설페이트", excludedFromCount: 2, irritantRisk: "HIGH" },
  ],
  detectedPatterns: [
    { patternId: "HYDRATION", name: "Hydration", nameKo: "보습 중심", description: "보습 패턴", confidence: 0.92, matchedIngredients: ["Glycerin","Panthenol","Hyaluronic Acid","Squalane"] },
    { patternId: "SOOTHING", name: "Soothing", nameKo: "진정 중심", description: "진정 패턴", confidence: 0.78, matchedIngredients: ["Madecassoside","Panthenol","Allantoin","Beta-Glucan"] },
  ],
  overallConfidence: 0.85, basedOnProductCount: 2,
  explain: { headline: "보습+진정", skinSummary: "건성·민감", preferredSummary: "", avoidSummary: "", patternSummary: "", tips: [] },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Run Tests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("═".repeat(80));
console.log("COSFIT FIT Score v3 (Safety-First) 검증");
console.log("═".repeat(80));

// v2 baseline 결과 (이전 테스트에서 확인된 값)
const V2_BASELINE = {
  atobarrier: { score: 100, grade: "PERFECT" },
  ahc:        { score: 0,   grade: "RISK" },
  retinol:    { score: 47,  grade: "POOR" },
};

const results: { label: string; result: FitScoreResult }[] = [];

function run(label: string, product: any, opts?: Partial<FitScoreRequest>) {
  const req: FitScoreRequest = {
    userStandard: PROFILE_SENSITIVE,
    targetProduct: product,
    skinType: "SENSITIVE",
    sensitivityLevel: 4,
    userAllergies: [],
    ...opts,
  };
  const r = calculateFitScore(req);
  results.push({ label, result: r });
  return r;
}

// ── 테스트 실행 ──

console.log("\n👤 프로필: 건성·민감 | 감도 4/5 | 인생템 2개 (공통배제 4종)\n");

const r1_ato = run("아토베리어 365 크림", ATOBARRIER);
const r2_ahc = run("AHC 선크림 (주의성분 다수)", AHC_SUN);
const r3_ret = run("이니스프리 레티놀 (향료 포함)", INNISFREE_RETINOL);
const r4_partial = run("성분 미확인 크림 X (PARTIAL)", PARTIAL_PRODUCT);

for (const { label, result: r } of results) {
  const emoji = { PERFECT: "🟢", GOOD: "🔵", FAIR: "🟡", POOR: "🟠", RISK: "🔴" }[r.grade] ?? "⚪";
  console.log(`${emoji} ${label}`);
  console.log(`   Score: ${r.score}점 (${r.grade}) | Confidence: ${r.confidence}`);
  console.log(`   Breakdown: base=${r.breakdown.baseScore} + bonus=${r.breakdown.bonusScore} + skin=${r.breakdown.skinSynergyBonus} - risk=${r.breakdown.riskPenalty} - novel=${r.breakdown.novelRiskPenalty} - excl=${r.breakdown.exclusionPenalty}`);
  console.log(`   매칭: ${r.reasons.length} | 리스크: ${r.risks.length} | 신규위험: ${r.novelRisks.length} | 배제패턴: ${r.exclusionFlags.length} | 누락: ${r.missing.length}`);
  if (r.dataWarning) console.log(`   ⚠️ ${r.dataWarning}`);
  console.log(`   💬 XAI:`);
  for (const e of r.explanations.slice(0, 4)) console.log(`      • ${e}`);
  console.log("");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2 → v3 비교표
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("═".repeat(80));
console.log("📊 v2 → v3 비교 (민감성·감도4 기준)");
console.log("═".repeat(80));
console.log(`${"제품".padEnd(28)} ${"v2 점수".padEnd(10)} ${"v3 점수".padEnd(10)} ${"변화".padEnd(8)} v3 핵심 변경`);
console.log("─".repeat(80));

const comparisons = [
  { name: "아토베리어 365 크림", v2: V2_BASELINE.atobarrier, v3: r1_ato, change: "안전 제품 유지" },
  { name: "AHC 선크림 SPF50+", v2: V2_BASELINE.ahc, v3: r2_ahc, change: "Red Flag 2배 + 배제패턴" },
  { name: "이니스프리 레티놀 시카", v2: V2_BASELINE.retinol, v3: r3_ret, change: "향료 배제패턴 감점" },
];

for (const c of comparisons) {
  const delta = c.v3.score - c.v2.score;
  const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;
  console.log(`${c.name.padEnd(28)} ${String(c.v2.score).padEnd(10)} ${String(c.v3.score).padEnd(10)} ${deltaStr.padEnd(8)} ${c.change}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Assertions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log(`\n${"═".repeat(80)}`);
console.log("✅ 검증 항목");
console.log("═".repeat(80));

let passed = 0, failed = 0;
function assert(d: string, c: boolean) { if (c) { passed++; console.log(`  ✅ ${d}`); } else { failed++; console.log(`  ❌ ${d}`); } }

// 1. 안전 제품은 여전히 높은 점수
assert("안전 제품(아토베리어) = PERFECT/GOOD 유지", ["PERFECT","GOOD"].includes(r1_ato.grade));
assert("안전 제품(아토베리어) 배제패턴 감점 없음", r1_ato.exclusionFlags.length === 0);

// 2. AHC 위험 제품 — v3에서 더 낮아야 함
assert("AHC 선크림 v3 점수 <= v2 점수 (0)", r2_ahc.score <= V2_BASELINE.ahc.score);
assert("AHC 선크림 = RISK", r2_ahc.grade === "RISK");
assert("AHC — 배제패턴(향료/알코올/옥시벤존) 감지 >= 2건", r2_ahc.exclusionFlags.length >= 2);
assert("AHC — 신규위험 성분 >= 3건", r2_ahc.novelRisks.length >= 3);

// 3. 레티놀 — 향료 배제패턴 감점 작동
assert("레티놀 시카: 향료 배제패턴 감점 > 0", r3_ret.breakdown.exclusionPenalty > 0);
assert("레티놀 시카 v3 <= v2 (47)", r3_ret.score <= V2_BASELINE.retinol.score);

// 4. PARTIAL 데이터 경고
assert("PARTIAL 제품: dataWarning 존재", r4_partial.dataWarning !== null);
assert("PARTIAL 제품: confidence = LOW", r4_partial.confidence === "LOW");

// 5. v3 모델 태그
assert("분석 모델 = cosfit-v3-safety-first", results.every(r => r.result.metadata.analysisModel === "cosfit-v3-safety-first"));

// 6. XAI 엄격 톤 검증
const ahcXai = r2_ahc.explanations.join(" ");
assert("AHC XAI에 '사용을 권장하지 않습니다' 또는 '리스크가 높습니다' 포함",
  ahcXai.includes("권장하지 않습니다") || ahcXai.includes("리스크가 높습니다") || ahcXai.includes("재고해"));

// 7. 성능
assert("모든 분석 < 5ms", results.every(r => r.result.metadata.processingTimeMs < 5));

console.log(`\n총 ${passed + failed}개 중 ${passed}개 통과, ${failed}개 실패`);
console.log("═".repeat(80));
