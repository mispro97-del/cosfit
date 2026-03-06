// ============================================================
// COSFIT Admin: 데이터 수집 센터 (FR-D01, A1-1, A1-2)
// ============================================================

"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ── Types ──
interface Progress {
  phase: string; processed: number; total: number;
  newProducts: number; updatedProducts: number; failedItems: number;
  normalizedCount: number; unmappedCount: number;
  message: string; elapsedMs: number;
}

interface SyncResult {
  status: string; totalFetched: number; afterFilter: number;
  newProducts: number; updatedProducts: number; skipped: number;
  ingredientsNormalized: number; ingredientsFailed: number;
  unmappedIngredients: Unmapped[]; qualityIssues: QI[];
  duration: number; dbStats: { bulkInserts: number; avgBatchMs: number };
}

interface Unmapped {
  rawName: string; closestMatch: string | null; similarity: number;
  productCount: number; sampleProducts: string[];
}

interface QI {
  reportNo: string; productName: string; issue: string; detail: string;
}

interface Log {
  id: string; source: string; type: string;
  status: "COMPLETED" | "IN_PROGRESS" | "FAILED";
  processed: number; failed: number;
  started: string; completed: string | null; by: string;
}

// ── Config ──
const PHASES = [
  { key: "fetching", label: "API 수집", icon: "🌐" },
  { key: "filtering", label: "필터링", icon: "🎯" },
  { key: "bulk_saving", label: "DB 적재", icon: "💾" },
  { key: "normalizing", label: "정규화", icon: "🧬" },
  { key: "finalizing", label: "상태 확정", icon: "✅" },
];

const ST = {
  COMPLETED: { bg: "bg-emerald-900/30", text: "text-emerald-400", label: "완료" },
  IN_PROGRESS: { bg: "bg-blue-900/30", text: "text-blue-400", label: "진행" },
  FAILED: { bg: "bg-red-900/30", text: "text-red-400", label: "실패" },
};

const ISSUE = {
  NO_INGREDIENTS: { icon: "⚠️", color: "text-amber-400", label: "성분 누락" },
  EMPTY_NAME: { icon: "❌", color: "text-red-400", label: "제품명 없음" },
  TOO_FEW_INGREDIENTS: { icon: "📉", color: "text-amber-400", label: "성분 부족" },
  DUPLICATE: { icon: "📋", color: "text-slate-400", label: "중복" },
  INVALID_FORMAT: { icon: "🔧", color: "text-orange-400", label: "형식 오류" },
};

// ── Mock ──
const HISTORY: Log[] = [
  { id: "s1", source: "식약처 API", type: "FULL_IMPORT", status: "COMPLETED", processed: 4712, failed: 47, started: "06/20 02:00", completed: "06/20 02:14", by: "cron" },
  { id: "s2", source: "식약처 API", type: "INCREMENTAL", status: "COMPLETED", processed: 312, failed: 3, started: "06/21 02:00", completed: "06/21 02:03", by: "cron" },
];

// ── Component ──
export default function DataCollectionPage() {
  const [logs, setLogs] = useState(HISTORY);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [tab, setTab] = useState<"logs" | "unmapped" | "quality" | "db">("logs");
  const [maxProducts, setMaxProducts] = useState(5000);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const startSync = useCallback((type: string) => {
    setSyncing(true);
    setResult(null);
    setTab("logs");

    const mockPhases: Partial<Progress>[] = [
      { phase: "fetching", processed: 0, total: 12000, message: "식약처 API 수집 중..." },
      { phase: "fetching", processed: 4800, total: 12000, message: "API 수집: 4,800 / 12,000" },
      { phase: "fetching", processed: 12000, total: 12000, message: "API 수집: 12,000 / 12,000" },
      { phase: "filtering", processed: 0, total: 12000, message: `우선순위 필터링: ${maxProducts.toLocaleString()}개 선정 중...` },
      { phase: "filtering", processed: maxProducts, total: 12000, message: `필터링 완료: 12,000건 중 ${maxProducts.toLocaleString()}건 선정 (TOP 40 브랜드 우선)` },
      { phase: "bulk_saving", processed: 0, total: maxProducts, message: "DB 적재: Bulk Insert (100건 배치)..." },
      { phase: "bulk_saving", processed: 2000, total: maxProducts, newProducts: 1247, updatedProducts: 753, message: `DB 적재: 2,000 / ${maxProducts.toLocaleString()}` },
      { phase: "bulk_saving", processed: maxProducts, total: maxProducts, newProducts: 3128, updatedProducts: 1872, message: `DB 적재 완료: 신규 3,128 / 업데이트 1,872` },
      { phase: "normalizing", processed: 0, total: maxProducts, message: "성분 정규화 파이프라인 실행..." },
      { phase: "normalizing", processed: 2500, total: maxProducts, normalizedCount: 18420, unmappedCount: 0, message: "정규화: 2,500 / 5,000 제품 처리" },
      { phase: "normalizing", processed: maxProducts, total: maxProducts, normalizedCount: 38210, unmappedCount: 5, message: "정규화 완료: 38,210 성분 매핑 / 미분류 5건" },
      { phase: "finalizing", processed: maxProducts, total: maxProducts, message: "dataStatus → SUCCESS 업데이트..." },
      { phase: "done", processed: maxProducts, total: maxProducts, newProducts: 3128, updatedProducts: 1872, normalizedCount: 38210, unmappedCount: 5, message: "✅ Full Import 완료" },
    ];

    let step = 0;
    pollRef.current = setInterval(() => {
      if (step >= mockPhases.length) {
        clearInterval(pollRef.current!);
        setSyncing(false);
        setResult({
          status: "COMPLETED", totalFetched: 12000, afterFilter: maxProducts,
          newProducts: 3128, updatedProducts: 1872, skipped: 7000,
          ingredientsNormalized: 38210, ingredientsFailed: 127,
          unmappedIngredients: [
            { rawName: "DL-알파토코페릴아세테이트", closestMatch: "Tocopheryl Acetate", similarity: 0.62, productCount: 847, sampleProducts: ["아토베리어 크림", "시카 크림", "선크림"] },
            { rawName: "하이드로제네이티드레시틴", closestMatch: "Hydrogenated Lecithin", similarity: 0.71, productCount: 523, sampleProducts: ["아토베리어 로션", "더마 시카 토너"] },
            { rawName: "에칠헥실글리세린", closestMatch: "Ethylhexylglycerin", similarity: 0.73, productCount: 412, sampleProducts: ["비타C 세럼", "모이스처 크림", "토너 패드"] },
            { rawName: "피이지-100스테아레이트", closestMatch: "PEG-100 Stearate", similarity: 0.58, productCount: 234, sampleProducts: ["다이브인 세럼"] },
            { rawName: "소르비탄세스퀴올레에이트", closestMatch: "Sorbitan Sesquioleate", similarity: 0.55, productCount: 89, sampleProducts: ["선크림 SPF50"] },
          ],
          qualityIssues: [
            { reportNo: "2024-01234", productName: "뷰티풀 크림 X", issue: "NO_INGREDIENTS", detail: "전성분 누락 → QUALITY_ISSUE" },
            { reportNo: "2024-02345", productName: "글로우 세럼 Y", issue: "TOO_FEW_INGREDIENTS", detail: "성분 1개 — 원본 형식 오류" },
            { reportNo: "2024-03456", productName: "(빈 이름)", issue: "EMPTY_NAME", detail: "보고번호 2024-03456의 제품명이 비어있음" },
          ],
          duration: 84200,
          dbStats: { bulkInserts: 50, avgBatchMs: 142 },
        });
        setLogs(prev => [{ id: "new", source: "식약처 API", type, status: "COMPLETED" as const, processed: maxProducts, failed: 127, started: "지금", completed: "완료", by: "admin" }, ...prev]);
        return;
      }
      const p = mockPhases[step];
      setProgress(prev => ({
        phase: p.phase ?? prev?.phase ?? "init",
        processed: p.processed ?? prev?.processed ?? 0,
        total: p.total ?? prev?.total ?? 0,
        newProducts: p.newProducts ?? prev?.newProducts ?? 0,
        updatedProducts: p.updatedProducts ?? prev?.updatedProducts ?? 0,
        failedItems: p.failedItems ?? prev?.failedItems ?? 0,
        normalizedCount: p.normalizedCount ?? prev?.normalizedCount ?? 0,
        unmappedCount: p.unmappedCount ?? prev?.unmappedCount ?? 0,
        message: p.message ?? "",
        elapsedMs: step * 1200,
      }));
      step++;
    }, 900);
  }, [maxProducts]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const phaseIdx = (p: string) => PHASES.findIndex(ph => ph.key === p);

  return (
    <div className="p-8 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white m-0">🗄️ 데이터 수집 센터</h1>
          <p className="text-sm text-[#8B92A5] mt-1">식약처 화장품 전성분 API · 우선순위 기반 Full Import</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#1A1E2E] rounded-lg border border-[#2D3348] px-2 py-1">
            <span className="text-[11px] text-[#8B92A5]">최대</span>
            <select
              value={maxProducts}
              onChange={e => setMaxProducts(Number(e.target.value))}
              className="bg-transparent text-white text-xs font-semibold border-none outline-none cursor-pointer"
              disabled={syncing}
            >
              <option value={1000}>1,000</option>
              <option value={3000}>3,000</option>
              <option value={5000}>5,000</option>
              <option value={10000}>10,000</option>
            </select>
            <span className="text-[11px] text-[#8B92A5]">건</span>
          </div>
          <button onClick={() => startSync("FULL_IMPORT")} disabled={syncing}
            className="px-4 py-2 rounded-lg text-sm font-semibold border-none cursor-pointer bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-all">
            {syncing ? "⏳ 수집 중..." : "🚀 Full Import 시작"}
          </button>
        </div>
      </div>

      {/* Live Progress */}
      {(syncing || result) && (
        <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-5 mb-5">
          {syncing && progress && (
            <>
              {/* Phase pipeline */}
              <div className="flex items-center gap-1 mb-4">
                {PHASES.map((ph, i) => {
                  const current = phaseIdx(progress.phase);
                  const active = i === current;
                  const done = i < current || progress.phase === "done";
                  return (
                    <div key={ph.key} className="flex items-center gap-1" style={{ flex: i < PHASES.length - 1 ? 1 : 0 }}>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{
                        background: active ? "rgba(59,130,246,0.15)" : done ? "rgba(34,197,94,0.1)" : "transparent",
                      }}>
                        <span className="text-sm">{done ? "✅" : ph.icon}</span>
                        <span className="text-[11px] font-medium" style={{ color: active ? "#60A5FA" : done ? "#6EE7B7" : "#555B6E" }}>{ph.label}</span>
                      </div>
                      {i < PHASES.length - 1 && (
                        <div className="flex-1 h-px mx-1" style={{ background: done ? "#22C55E" : "#2D3348" }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-white">{progress.message}</span>
                <span className="text-xs text-[#8B92A5]">{(progress.elapsedMs / 1000).toFixed(0)}초</span>
              </div>
              <div className="h-2 bg-[#2D3348] rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full transition-all duration-500" style={{
                  width: progress.total > 0 ? `${Math.min((progress.processed / progress.total) * 100, 100)}%` : "3%",
                  background: progress.phase === "error" ? "#EF4444" : "linear-gradient(90deg, #3B82F6, #60A5FA)",
                }} />
              </div>

              {/* Live counters */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { l: "수집", v: progress.processed.toLocaleString(), c: "text-white" },
                  { l: "신규", v: progress.newProducts.toLocaleString(), c: "text-emerald-400" },
                  { l: "업데이트", v: progress.updatedProducts.toLocaleString(), c: "text-blue-400" },
                  { l: "정규화", v: progress.normalizedCount.toLocaleString(), c: "text-violet-400" },
                  { l: "미분류", v: String(progress.unmappedCount), c: progress.unmappedCount > 0 ? "text-amber-400" : "text-[#555B6E]" },
                ].map((s, i) => (
                  <div key={i} className="text-center bg-[#0F1117] rounded-lg py-2">
                    <div className="text-[10px] text-[#555B6E]">{s.l}</div>
                    <div className={`text-base font-bold ${s.c}`}>{s.v}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!syncing && result && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{result.status === "COMPLETED" ? "✅" : "❌"}</span>
                <span className="text-sm font-semibold text-white">Full Import {result.status === "COMPLETED" ? "완료" : "실패"}</span>
                <span className="text-xs text-[#555B6E]">({(result.duration / 1000).toFixed(1)}초)</span>
              </div>

              <div className="grid grid-cols-6 gap-2 mb-3">
                {[
                  { l: "API 수집", v: result.totalFetched.toLocaleString(), c: "text-white" },
                  { l: "필터 후", v: result.afterFilter.toLocaleString(), c: "text-cyan-400" },
                  { l: "신규 적재", v: result.newProducts.toLocaleString(), c: "text-emerald-400" },
                  { l: "업데이트", v: result.updatedProducts.toLocaleString(), c: "text-blue-400" },
                  { l: "정규화 성공", v: result.ingredientsNormalized.toLocaleString(), c: "text-violet-400" },
                  { l: "미분류", v: String(result.unmappedIngredients.length), c: result.unmappedIngredients.length > 0 ? "text-amber-400" : "text-emerald-400" },
                ].map((s, i) => (
                  <div key={i} className="text-center bg-[#0F1117] rounded-lg py-2.5">
                    <div className="text-[10px] text-[#555B6E]">{s.l}</div>
                    <div className={`text-lg font-bold ${s.c}`}>{s.v}</div>
                  </div>
                ))}
              </div>

              {/* DB Performance */}
              <div className="flex gap-4 text-xs text-[#8B92A5] mb-2">
                <span>Bulk Insert: {result.dbStats.bulkInserts}회 × 100건 배치</span>
                <span>평균 배치: {result.dbStats.avgBatchMs}ms</span>
                <span>건너뜀: {result.skipped.toLocaleString()}건</span>
              </div>

              {/* Action links */}
              <div className="flex gap-3 pt-2 border-t border-[#2D3348]">
                {result.unmappedIngredients.length > 0 && (
                  <button onClick={() => setTab("unmapped")} className="text-xs text-amber-400 cursor-pointer bg-transparent border-none hover:underline">
                    🧬 미분류 성분 {result.unmappedIngredients.length}건 →
                  </button>
                )}
                {result.qualityIssues.length > 0 && (
                  <button onClick={() => setTab("quality")} className="text-xs text-orange-400 cursor-pointer bg-transparent border-none hover:underline">
                    ⚠️ 품질 이슈 {result.qualityIssues.length}건 →
                  </button>
                )}
                <button onClick={() => setTab("db")} className="text-xs text-blue-400 cursor-pointer bg-transparent border-none hover:underline">
                  📊 DB 적재 상세 →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4">
        {[
          ["logs", "📋 수집 이력"],
          ["unmapped", `🧬 미분류 성분 (${result?.unmappedIngredients.length ?? 0})`],
          ["quality", `⚠️ 품질 이슈 (${result?.qualityIssues.length ?? 0})`],
          ["db", "📊 DB/인덱스"],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-none cursor-pointer transition-all ${tab === k ? "bg-white/10 text-white" : "bg-transparent text-[#555B6E] hover:text-[#8B92A5]"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Tab: Logs */}
      {tab === "logs" && (
        <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#2D3348]">
              {["상태", "소스", "타입", "처리", "실패", "시작", "완료", "실행자"].map(h =>
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-[#555B6E]">{h}</th>)}
            </tr></thead>
            <tbody>{logs.map(l => {
              const st = ST[l.status] ?? ST.FAILED;
              return (
                <tr key={l.id} className="border-b border-[#1E2234] hover:bg-[#1E2234]">
                  <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${st.bg} ${st.text}`}>{st.label}</span></td>
                  <td className="px-4 py-3 text-[#C8CDD8]">{l.source}</td>
                  <td className="px-4 py-3 text-[#8B92A5] font-mono text-xs">{l.type}</td>
                  <td className="px-4 py-3 text-[#C8CDD8] font-mono">{l.processed.toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={l.failed > 0 ? "text-amber-400 font-semibold" : "text-[#555B6E]"}>{l.failed}</span></td>
                  <td className="px-4 py-3 text-[#8B92A5] text-xs">{l.started}</td>
                  <td className="px-4 py-3 text-[#8B92A5] text-xs">{l.completed ?? "—"}</td>
                  <td className="px-4 py-3 text-[#555B6E] text-xs">{l.by}</td>
                </tr>);
            })}</tbody>
          </table>
        </div>
      )}

      {/* Tab: Unmapped Ingredients (A1-2) */}
      {tab === "unmapped" && (
        <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2D3348] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white m-0">🧬 미분류 성분 (정규화 매핑 실패)</h3>
            <span className="text-xs text-[#8B92A5]">빈도순 정렬 · 수동 매핑 필요</span>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#2D3348]">
              {["원본 성분명", "최근접 매칭", "유사도", "영향 제품 수", "샘플 제품"].map(h =>
                <th key={h} className="text-left px-5 py-2.5 text-xs font-medium text-[#555B6E]">{h}</th>)}
            </tr></thead>
            <tbody>
              {(result?.unmappedIngredients ?? []).map((u, i) => {
                const simColor = u.similarity >= 0.7 ? "text-emerald-400" : u.similarity >= 0.5 ? "text-amber-400" : "text-red-400";
                return (
                  <tr key={i} className="border-b border-[#1E2234] hover:bg-[#1E2234]">
                    <td className="px-5 py-3 font-mono text-xs text-[#E5E7EB]">{u.rawName}</td>
                    <td className="px-5 py-3 font-mono text-xs text-[#8B92A5]">{u.closestMatch ?? <em className="text-[#555B6E]">없음</em>}</td>
                    <td className="px-5 py-3"><span className={`font-mono text-xs font-semibold ${simColor}`}>{(u.similarity * 100).toFixed(0)}%</span></td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-bold text-white">{u.productCount.toLocaleString()}</span>
                      <span className="text-[10px] text-[#555B6E] ml-1">개 제품</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-[#8B92A5]">{u.sampleProducts.join(", ")}</td>
                  </tr>);
              })}
              {(!result || result.unmappedIngredients.length === 0) && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-[#555B6E]">미분류 성분이 없습니다 ✅</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Quality Issues */}
      {tab === "quality" && (
        <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2D3348]">
            <h3 className="text-sm font-semibold text-white m-0">⚠️ 데이터 품질 이슈</h3>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#2D3348]">
              {["유형", "보고번호", "제품명", "상세", "상태"].map(h =>
                <th key={h} className="text-left px-5 py-2.5 text-xs font-medium text-[#555B6E]">{h}</th>)}
            </tr></thead>
            <tbody>
              {(result?.qualityIssues ?? []).map((q, i) => {
                const iss = ISSUE[q.issue as keyof typeof ISSUE] ?? { icon: "❓", color: "text-slate-400", label: q.issue };
                return (
                  <tr key={i} className="border-b border-[#1E2234]">
                    <td className="px-5 py-3"><span className={`text-xs font-semibold ${iss.color}`}>{iss.icon} {iss.label}</span></td>
                    <td className="px-5 py-3 font-mono text-xs text-[#8B92A5]">{q.reportNo}</td>
                    <td className="px-5 py-3 text-[#C8CDD8]">{q.productName}</td>
                    <td className="px-5 py-3 text-xs text-[#8B92A5]">{q.detail}</td>
                    <td className="px-5 py-3"><span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-900/30 text-amber-400">QUALITY_ISSUE</span></td>
                  </tr>);
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: DB Stats & Index */}
      {tab === "db" && (
        <div className="space-y-4">
          <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-5">
            <h3 className="text-sm font-semibold text-white m-0 mb-3">📊 Bulk Insert 성능</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { l: "배치 횟수", v: `${result?.dbStats.bulkInserts ?? 50}회`, sub: "× 100건/배치" },
                { l: "평균 배치 시간", v: `${result?.dbStats.avgBatchMs ?? 142}ms`, sub: "Transaction 단위" },
                { l: "총 소요 시간", v: `${((result?.duration ?? 84200) / 1000).toFixed(1)}초`, sub: "전체 파이프라인" },
              ].map((s, i) => (
                <div key={i} className="bg-[#0F1117] rounded-lg p-3.5">
                  <div className="text-xs text-[#555B6E]">{s.l}</div>
                  <div className="text-xl font-bold text-white mt-1">{s.v}</div>
                  <div className="text-[10px] text-[#555B6E] mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-5">
            <h3 className="text-sm font-semibold text-white m-0 mb-3">🔍 인덱스 현황 (Prisma Schema @@index)</h3>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#2D3348]">
                {["테이블", "인덱스 필드", "타입", "검색 최적화"].map(h =>
                  <th key={h} className="text-left px-4 py-2 text-xs font-medium text-[#555B6E]">{h}</th>)}
              </tr></thead>
              <tbody>
                {[
                  { table: "product_masters", field: "name", type: "B-tree", purpose: "제품명 검색" },
                  { table: "product_masters", field: "brandId", type: "B-tree", purpose: "브랜드 필터" },
                  { table: "product_masters", field: "category", type: "B-tree", purpose: "카테고리 필터" },
                  { table: "product_masters", field: "status", type: "B-tree", purpose: "상태 필터 (ACTIVE 노출)" },
                  { table: "product_masters", field: "dataStatus", type: "B-tree", purpose: "수집 상태 관리 (SUCCESS 노출)" },
                  { table: "product_masters", field: "kfdaReportNo", type: "UNIQUE", purpose: "식약처 보고번호 중복 방지" },
                  { table: "brands", field: "name", type: "UNIQUE + Index", purpose: "브랜드명 검색/중복 방지" },
                  { table: "brands", field: "nameKo", type: "B-tree", purpose: "한글 브랜드명 검색" },
                  { table: "ingredients", field: "nameInci", type: "UNIQUE + Index", purpose: "INCI명 매칭" },
                  { table: "ingredients", field: "nameKo", type: "B-tree", purpose: "한글 성분명 검색" },
                ].map((idx, i) => (
                  <tr key={i} className="border-b border-[#1E2234]">
                    <td className="px-4 py-2.5 font-mono text-xs text-[#C8CDD8]">{idx.table}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-emerald-400">{idx.field}</td>
                    <td className="px-4 py-2.5 text-xs text-[#8B92A5]">{idx.type}</td>
                    <td className="px-4 py-2.5 text-xs text-[#8B92A5]">{idx.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[11px] text-[#555B6E] mt-3">
              ✅ 모든 인덱스는 Prisma Schema의 @@index 선언으로 마이그레이션 시 자동 생성됩니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
