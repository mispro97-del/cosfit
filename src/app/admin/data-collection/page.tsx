// ============================================================
// COSFIT Admin: 데이터 수집 센터 (KFDA 연동 + 일일 배치)
// ============================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  startFullKfdaSync,
  getKfdaSyncHistory,
  getDailyBatchStatus,
  toggleDailyBatch,
  triggerDailySync,
} from "./actions";
import type { SyncHistoryItem, BatchJobStatus } from "./actions";

// ── Component ──

export default function DataCollectionPage() {
  const [history, setHistory] = useState<SyncHistoryItem[]>([]);
  const [batchJobs, setBatchJobs] = useState<BatchJobStatus[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [tab, setTab] = useState<"kfda" | "batch">("kfda");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [historyData, batchData] = await Promise.all([
        getKfdaSyncHistory(),
        getDailyBatchStatus(),
      ]);
      setHistory(historyData);
      setBatchJobs(batchData);
    } catch (err: any) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Full sync handler
  const handleFullSync = async () => {
    if (!password) {
      setError("비밀번호를 입력해주세요.");
      return;
    }

    setError("");
    setSyncing(true);
    setShowPasswordModal(false);
    setSyncResult(null);

    try {
      const result = await startFullKfdaSync(password);
      setSyncResult(result);
      setPassword("");
      await loadData();
    } catch (err: any) {
      setError(err.message);
      setSyncResult({ error: err.message });
    } finally {
      setSyncing(false);
    }
  };

  // Daily sync handler
  const handleDailySync = async () => {
    setSyncing(true);
    try {
      const result = await triggerDailySync();
      setSyncResult(result);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Toggle batch
  const handleToggleBatch = async (type: string, enabled: boolean) => {
    try {
      await toggleDailyBatch(type, enabled);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Format date
  const formatDate = (iso: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-[#8B92A5] text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white m-0">
            Data Collection Center
          </h1>
          <p className="text-sm text-[#8B92A5] mt-1">
            KFDA Full Sync + Daily Batch Management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDailySync}
            disabled={syncing}
            className="px-4 py-2 rounded-lg text-sm font-semibold border-none cursor-pointer bg-[#1A1E2E] text-[#8B92A5] border border-[#2D3348] hover:bg-[#2D3348] hover:text-white disabled:opacity-50 transition-all"
          >
            Daily Sync
          </button>
          <button
            onClick={() => setShowPasswordModal(true)}
            disabled={syncing}
            className="px-4 py-2 rounded-lg text-sm font-semibold border-none cursor-pointer bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-all"
          >
            {syncing ? "Syncing..." : "Full Sync"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-sm">
          {error}
          <button
            onClick={() => setError("")}
            className="ml-3 text-red-500 hover:text-red-300 bg-transparent border-none cursor-pointer"
          >
            X
          </button>
        </div>
      )}

      {/* Sync Result */}
      {syncResult && !syncResult.error && (
        <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-emerald-400">
              Sync Complete
            </span>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {[
              { l: "Total", v: syncResult.total?.toLocaleString() ?? "0", c: "text-white" },
              { l: "Processed", v: syncResult.processed?.toLocaleString() ?? "0", c: "text-blue-400" },
              { l: "Created", v: syncResult.created?.toLocaleString() ?? "0", c: "text-emerald-400" },
              { l: "Updated", v: syncResult.updated?.toLocaleString() ?? "0", c: "text-cyan-400" },
              { l: "Errors", v: syncResult.errors?.toLocaleString() ?? "0", c: syncResult.errors > 0 ? "text-red-400" : "text-[#555B6E]" },
            ].map((s, i) => (
              <div key={i} className="text-center bg-[#0F1117] rounded-lg py-2.5">
                <div className="text-[10px] text-[#555B6E]">{s.l}</div>
                <div className={`text-lg font-bold ${s.c}`}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4">
        {[
          { key: "kfda" as const, label: "KFDA Sync History" },
          { key: "batch" as const, label: "Daily Batch" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-none cursor-pointer transition-all ${
              tab === t.key
                ? "bg-white/10 text-white"
                : "bg-transparent text-[#555B6E] hover:text-[#8B92A5]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: KFDA Sync History */}
      {tab === "kfda" && (
        <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2D3348]">
                {["Type", "Total", "Processed", "Created", "Updated", "Errors", "Started", "Completed"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-2.5 text-xs font-medium text-[#555B6E]"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-[#555B6E]"
                  >
                    No sync history yet
                  </td>
                </tr>
              )}
              {history.map((h) => (
                <tr
                  key={h.id}
                  className="border-b border-[#1E2234] hover:bg-[#1E2234]"
                >
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                        h.syncType === "FULL"
                          ? "bg-blue-900/30 text-blue-400"
                          : "bg-emerald-900/30 text-emerald-400"
                      }`}
                    >
                      {h.syncType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#C8CDD8] font-mono">
                    {h.totalCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-[#C8CDD8] font-mono">
                    {h.processed.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-emerald-400 font-mono">
                    {h.created.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-blue-400 font-mono">
                    {h.updated.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        h.errors > 0
                          ? "text-red-400 font-semibold"
                          : "text-[#555B6E]"
                      }
                    >
                      {h.errors}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#8B92A5] text-xs">
                    {formatDate(h.startedAt)}
                  </td>
                  <td className="px-4 py-3 text-[#8B92A5] text-xs">
                    {formatDate(h.completedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Daily Batch */}
      {tab === "batch" && (
        <div className="space-y-4">
          {batchJobs.map((job) => (
            <div
              key={job.type}
              className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white m-0">
                    {job.type === "KFDA_SYNC"
                      ? "KFDA Daily Sync"
                      : "Ingredient Knowledge Enrichment"}
                  </h3>
                  <p className="text-xs text-[#8B92A5] mt-1">
                    Schedule: {job.schedule} (cron)
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleToggleBatch(job.type, !job.enabled)
                  }
                  className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer border-none ${
                    job.enabled ? "bg-emerald-600" : "bg-[#2D3348]"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      job.enabled ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#0F1117] rounded-lg p-3">
                  <div className="text-[10px] text-[#555B6E]">Status</div>
                  <div
                    className={`text-sm font-semibold mt-1 ${
                      job.enabled ? "text-emerald-400" : "text-[#555B6E]"
                    }`}
                  >
                    {job.enabled ? "ON" : "OFF"}
                  </div>
                </div>
                <div className="bg-[#0F1117] rounded-lg p-3">
                  <div className="text-[10px] text-[#555B6E]">Last Run</div>
                  <div className="text-sm font-medium text-[#C8CDD8] mt-1">
                    {job.lastRunAt ? formatDate(job.lastRunAt) : "Never"}
                  </div>
                </div>
                <div className="bg-[#0F1117] rounded-lg p-3">
                  <div className="text-[10px] text-[#555B6E]">Last Result</div>
                  <div className="text-sm font-medium text-[#C8CDD8] mt-1">
                    {job.lastResult
                      ? `P:${(job.lastResult as any).processed ?? 0} C:${(job.lastResult as any).created ?? 0}`
                      : "-"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-6 w-[400px]">
            <h3 className="text-base font-semibold text-white mb-1">
              Admin Verification
            </h3>
            <p className="text-xs text-[#8B92A5] mb-4">
              Full sync requires password confirmation.
            </p>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              className="w-full px-3 py-2 rounded-lg bg-[#0F1117] border border-[#2D3348] text-white text-sm outline-none focus:border-blue-500 mb-3"
              onKeyDown={(e) => e.key === "Enter" && handleFullSync()}
              autoFocus
            />

            {error && (
              <p className="text-xs text-red-400 mb-3">{error}</p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassword("");
                  setError("");
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-transparent border border-[#2D3348] text-[#8B92A5] cursor-pointer hover:bg-[#2D3348] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFullSync}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white border-none cursor-pointer hover:bg-blue-500 transition-colors"
              >
                Start Full Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
