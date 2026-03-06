// ============================================================
// COSFIT - Admin: 성분 정규화 배치 작업
// app/(admin)/normalization/page.tsx
// ============================================================
// 수집된 원본 성분 데이터를 IngredientNormalizer로 정규화하고,
// 결과(성공/실패/유사도)를 테이블로 관리하는 배치 작업 UI.
// ============================================================

"use client";

import { useState, useEffect } from "react";

// ── Types ──

interface BatchResult {
  totalProcessed: number;
  resolved: number;
  unresolved: number;
  resolveRate: number;
  failureLogs: FailureLog[];
}

interface FailureLog {
  rawName: string;
  closestMatch: string | null;
  similarity: number;
  status: "unresolved" | "manually_resolved" | "ignored";
}

interface BatchHistoryItem {
  id: string;
  runAt: string;
  processed: number;
  resolved: number;
  unresolved: number;
  duration: string;
}

// ── Mock Data ──

const MOCK_HISTORY: BatchHistoryItem[] = [
  { id: "bat_01", runAt: "2025-06-15 02:30", processed: 500, resolved: 487, unresolved: 13, duration: "4.2s" },
  { id: "bat_02", runAt: "2025-06-14 02:30", processed: 320, resolved: 312, unresolved: 8, duration: "2.8s" },
  { id: "bat_03", runAt: "2025-06-13 02:30", processed: 150, resolved: 150, unresolved: 0, duration: "1.1s" },
  { id: "bat_04", runAt: "2025-06-12 14:00", processed: 1200, resolved: 1147, unresolved: 53, duration: "9.7s" },
];

const MOCK_FAILURES: FailureLog[] = [
  { rawName: "DL-알파토코페릴아세테이트", closestMatch: "Tocopheryl Acetate", similarity: 0.62, status: "unresolved" },
  { rawName: "피이지-100스테아레이트", closestMatch: "PEG-100 Stearate", similarity: 0.58, status: "unresolved" },
  { rawName: "하이드로제네이티드레시틴", closestMatch: "Hydrogenated Lecithin", similarity: 0.71, status: "unresolved" },
  { rawName: "소르비탄세스퀴올레에이트", closestMatch: "Sorbitan Sesquioleate", similarity: 0.55, status: "unresolved" },
  { rawName: "에이치디아이/트리메틸올헥실락톤크로스폴리머", closestMatch: null, similarity: 0, status: "unresolved" },
  { rawName: "정제수", closestMatch: "Water", similarity: 0.31, status: "manually_resolved" },
  { rawName: "디소듐이디티에이", closestMatch: "Disodium EDTA", similarity: 0.67, status: "unresolved" },
  { rawName: "카보머", closestMatch: "Carbomer", similarity: 0.82, status: "manually_resolved" },
  { rawName: "트로메타민", closestMatch: "Tromethamine", similarity: 0.78, status: "unresolved" },
  { rawName: "잔탄검", closestMatch: "Xanthan Gum", similarity: 0.44, status: "manually_resolved" },
  { rawName: "에칠헥실글리세린", closestMatch: "Ethylhexylglycerin", similarity: 0.73, status: "unresolved" },
  { rawName: "1,2-헥산디올", closestMatch: "1,2-Hexanediol", similarity: 0.85, status: "unresolved" },
  { rawName: "하이드록시에틸아크릴레이트/소듐아크릴로일디메틸타우레이트코폴리머", closestMatch: null, similarity: 0, status: "unresolved" },
];

// ── Component ──

export default function NormalizationPage() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastResult, setLastResult] = useState<BatchResult | null>(null);
  const [failures, setFailures] = useState(MOCK_FAILURES);
  const [history] = useState(MOCK_HISTORY);
  const [showResolved, setShowResolved] = useState(false);

  const runBatch = () => {
    setRunning(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setRunning(false);
          setLastResult({
            totalProcessed: 500,
            resolved: 487,
            unresolved: 13,
            resolveRate: 97.4,
            failureLogs: MOCK_FAILURES,
          });
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 200);
  };

  const handleManualResolve = (rawName: string) => {
    setFailures((prev) =>
      prev.map((f) =>
        f.rawName === rawName ? { ...f, status: "manually_resolved" as const } : f
      )
    );
  };

  const handleIgnore = (rawName: string) => {
    setFailures((prev) =>
      prev.map((f) =>
        f.rawName === rawName ? { ...f, status: "ignored" as const } : f
      )
    );
  };

  const visibleFailures = showResolved
    ? failures
    : failures.filter((f) => f.status === "unresolved");

  const unresolvedCount = failures.filter((f) => f.status === "unresolved").length;
  const resolvedCount = failures.filter((f) => f.status === "manually_resolved").length;

  return (
    <div className="p-8 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white m-0">🧬 성분 정규화 배치</h1>
          <p className="text-sm text-[#8B92A5] mt-1">
            수집된 원본 성분명을 INCI 표준명으로 정규화 (IngredientNormalizer)
          </p>
        </div>
        <button
          onClick={runBatch}
          disabled={running}
          className="px-4 py-2 rounded-lg text-sm font-medium border-none cursor-pointer transition-all bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {running ? `⏳ 처리 중... ${Math.min(Math.round(progress), 100)}%` : "▶ 배치 실행"}
        </button>
      </div>

      {/* Progress bar */}
      {running && (
        <div className="mb-6 bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8B92A5]">정규화 진행률</span>
            <span className="text-xs font-semibold text-violet-400">
              {Math.min(Math.round(progress), 100)}%
            </span>
          </div>
          <div className="h-2 bg-[#2D3348] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(progress, 100)}%`,
                background: "linear-gradient(90deg, #7C3AED, #A78BFA)",
              }}
            />
          </div>
          <div className="flex gap-6 mt-3 text-xs text-[#8B92A5]">
            <span>4단계 매칭: EXACT → ALIAS → CAS → FUZZY</span>
            <span>임계값: 0.75</span>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "마지막 처리량", value: lastResult?.totalProcessed ?? MOCK_HISTORY[0]?.processed ?? 0, color: "text-white" },
          { label: "정규화 성공", value: lastResult?.resolved ?? MOCK_HISTORY[0]?.resolved ?? 0, color: "text-emerald-400" },
          { label: "미해결", value: unresolvedCount, color: "text-amber-400" },
          { label: "성공률", value: `${lastResult?.resolveRate ?? 97.4}%`, color: "text-violet-400" },
        ].map((s, i) => (
          <div key={i} className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-4">
            <div className="text-xs text-[#8B92A5] mb-1">{s.label}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Failure logs table */}
      <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-[#2D3348] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white m-0">
            미해결 성분 목록
            <span className="ml-2 text-xs font-normal text-[#8B92A5]">
              ({unresolvedCount}개 미해결 / {resolvedCount}개 수동 처리)
            </span>
          </h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="accent-violet-500"
            />
            <span className="text-xs text-[#8B92A5]">처리 완료 포함</span>
          </label>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2D3348]">
              <th className="text-left px-5 py-2.5 text-xs font-medium text-[#555B6E]">원본 성분명</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-[#555B6E]">최근접 매칭</th>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-[#555B6E]">유사도</th>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-[#555B6E]">상태</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-[#555B6E]">작업</th>
            </tr>
          </thead>
          <tbody>
            {visibleFailures.map((f, i) => {
              const simColor =
                f.similarity >= 0.75 ? "text-emerald-400"
                : f.similarity >= 0.5 ? "text-amber-400"
                : f.similarity > 0 ? "text-red-400"
                : "text-[#555B6E]";
              const statusLabel =
                f.status === "manually_resolved" ? "수동 처리"
                : f.status === "ignored" ? "무시"
                : "미해결";
              const statusBg =
                f.status === "manually_resolved" ? "bg-emerald-900/30 text-emerald-400"
                : f.status === "ignored" ? "bg-slate-700/30 text-slate-400"
                : "bg-amber-900/30 text-amber-400";

              return (
                <tr
                  key={i}
                  className="border-b border-[#1E2234] hover:bg-[#1E2234] transition-colors"
                  style={{ opacity: f.status !== "unresolved" ? 0.5 : 1 }}
                >
                  <td className="px-5 py-3 text-[#E5E7EB] font-mono text-xs">{f.rawName}</td>
                  <td className="px-4 py-3 text-[#8B92A5] font-mono text-xs">
                    {f.closestMatch ?? <span className="italic text-[#555B6E]">매칭 없음</span>}
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className={`font-mono text-xs font-semibold ${simColor}`}>
                      {f.similarity > 0 ? `${(f.similarity * 100).toFixed(0)}%` : "—"}
                    </span>
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${statusBg}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="text-right px-5 py-3">
                    {f.status === "unresolved" && (
                      <div className="flex gap-1.5 justify-end">
                        {f.closestMatch && f.similarity >= 0.5 && (
                          <button
                            onClick={() => handleManualResolve(f.rawName)}
                            className="text-[11px] px-2 py-1 rounded-md bg-emerald-900/30 text-emerald-400 border-none cursor-pointer hover:bg-emerald-900/50 transition-all"
                          >
                            매칭 수락
                          </button>
                        )}
                        <button
                          onClick={() => handleIgnore(f.rawName)}
                          className="text-[11px] px-2 py-1 rounded-md bg-slate-700/30 text-slate-400 border-none cursor-pointer hover:bg-slate-700/50 transition-all"
                        >
                          무시
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Batch history */}
      <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2D3348]">
          <h3 className="text-sm font-semibold text-white m-0">배치 실행 이력</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2D3348]">
              {["실행 시각", "처리 건수", "성공", "미해결", "소요 시간", "성공률"].map((h) => (
                <th key={h} className="text-left px-5 py-2.5 text-xs font-medium text-[#555B6E]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((h) => {
              const rate = h.processed > 0 ? ((h.resolved / h.processed) * 100).toFixed(1) : "—";
              return (
                <tr key={h.id} className="border-b border-[#1E2234] hover:bg-[#1E2234] transition-colors">
                  <td className="px-5 py-3 text-[#8B92A5] text-xs">{h.runAt}</td>
                  <td className="px-5 py-3 text-[#C8CDD8] font-mono">{h.processed}</td>
                  <td className="px-5 py-3 text-emerald-400 font-mono">{h.resolved}</td>
                  <td className="px-5 py-3 text-amber-400 font-mono">{h.unresolved}</td>
                  <td className="px-5 py-3 text-[#8B92A5]">{h.duration}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold ${Number(rate) >= 95 ? "text-emerald-400" : "text-amber-400"}`}>
                      {rate}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
