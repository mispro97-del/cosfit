// ============================================================
// COSFIT Admin: Ingredient Knowledge Management
// ============================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getIngredientsWithKnowledgeStatus,
  enrichSelectedIngredients,
  triggerBatchEnrichment,
  getIngredientKnowledge,
} from "./actions";
import type { IngredientKnowledgeItem, PaginatedIngredients } from "./actions";

export default function IngredientKnowledgePage() {
  const [data, setData] = useState<PaginatedIngredients | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "enriched" | "not-enriched">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<any>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [batchLimit, setBatchLimit] = useState(10);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getIngredientsWithKnowledgeStatus(page, filter, search);
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Enrich selected
  const handleEnrichSelected = async () => {
    if (selected.size === 0) return;
    setEnriching(true);
    setEnrichResult(null);
    try {
      const result = await enrichSelectedIngredients(Array.from(selected));
      setEnrichResult(result);
      setSelected(new Set());
      await loadData();
    } catch (err: any) {
      setEnrichResult({ error: err.message });
    } finally {
      setEnriching(false);
    }
  };

  // Batch enrich
  const handleBatchEnrich = async () => {
    setEnriching(true);
    setEnrichResult(null);
    try {
      const result = await triggerBatchEnrichment(batchLimit);
      setEnrichResult(result);
      await loadData();
    } catch (err: any) {
      setEnrichResult({ error: err.message });
    } finally {
      setEnriching(false);
    }
  };

  // View detail
  const handleViewDetail = async (id: string) => {
    setDetailId(id);
    try {
      const detail = await getIngredientKnowledge(id);
      setDetailData(detail);
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (!data) return;
    if (selected.size === data.ingredients.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.ingredients.map((i) => i.id)));
    }
  };

  return (
    <div className="p-8 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white m-0">
            Ingredient Knowledge DB
          </h1>
          <p className="text-sm text-[#8B92A5] mt-1">
            AI-powered ingredient knowledge enrichment (Claude API)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleEnrichSelected}
              disabled={enriching}
              className="px-4 py-2 rounded-lg text-sm font-semibold border-none cursor-pointer bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition-all"
            >
              {enriching ? "Processing..." : `Enrich ${selected.size} Selected`}
            </button>
          )}
          <div className="flex items-center gap-1 bg-[#1A1E2E] rounded-lg border border-[#2D3348] px-2 py-1">
            <span className="text-[11px] text-[#8B92A5]">Limit</span>
            <select
              value={batchLimit}
              onChange={(e) => setBatchLimit(Number(e.target.value))}
              className="bg-transparent text-white text-xs font-semibold border-none outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <button
            onClick={handleBatchEnrich}
            disabled={enriching}
            className="px-4 py-2 rounded-lg text-sm font-semibold border-none cursor-pointer bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-all"
          >
            {enriching ? "Processing..." : "Batch Enrich"}
          </button>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-4 text-center">
            <div className="text-[10px] text-[#555B6E]">Total Ingredients</div>
            <div className="text-2xl font-bold text-white mt-1">
              {data.totalCount.toLocaleString()}
            </div>
          </div>
          <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-4 text-center">
            <div className="text-[10px] text-[#555B6E]">Enriched</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {data.enrichedCount.toLocaleString()}
            </div>
          </div>
          <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-4 text-center">
            <div className="text-[10px] text-[#555B6E]">Not Enriched</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {(data.totalCount - data.enrichedCount).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Enrich Result */}
      {enrichResult && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg border text-sm ${
            enrichResult.error
              ? "bg-red-900/30 border-red-800 text-red-400"
              : "bg-emerald-900/30 border-emerald-800 text-emerald-400"
          }`}
        >
          {enrichResult.error
            ? enrichResult.error
            : `Enriched: ${enrichResult.enriched} / Errors: ${enrichResult.errors}`}
          <button
            onClick={() => setEnrichResult(null)}
            className="ml-3 hover:opacity-70 bg-transparent border-none cursor-pointer text-current"
          >
            X
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1">
          {(
            [
              { key: "all" as const, label: "All" },
              { key: "enriched" as const, label: "Enriched" },
              { key: "not-enriched" as const, label: "Not Enriched" },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-none cursor-pointer transition-all ${
                filter === f.key
                  ? "bg-white/10 text-white"
                  : "bg-transparent text-[#555B6E] hover:text-[#8B92A5]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search ingredient..."
          className="flex-1 px-3 py-1.5 rounded-lg bg-[#1A1E2E] border border-[#2D3348] text-white text-xs outline-none focus:border-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2D3348]">
              <th className="px-4 py-2.5 text-left">
                <input
                  type="checkbox"
                  checked={
                    data
                      ? selected.size === data.ingredients.length &&
                        data.ingredients.length > 0
                      : false
                  }
                  onChange={toggleSelectAll}
                  className="cursor-pointer"
                />
              </th>
              {["INCI Name", "Korean", "Safety", "Knowledge", "Updated", ""].map(
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
            {loading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-[#555B6E]"
                >
                  Loading...
                </td>
              </tr>
            )}
            {!loading && data?.ingredients.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-[#555B6E]"
                >
                  No ingredients found
                </td>
              </tr>
            )}
            {!loading &&
              data?.ingredients.map((ing) => (
                <tr
                  key={ing.id}
                  className="border-b border-[#1E2234] hover:bg-[#1E2234]"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(ing.id)}
                      onChange={() => toggleSelect(ing.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#C8CDD8]">
                    {ing.nameInci}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#8B92A5]">
                    {ing.nameKo ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                        ing.safetyGrade === "SAFE"
                          ? "bg-emerald-900/30 text-emerald-400"
                          : ing.safetyGrade === "MODERATE"
                          ? "bg-amber-900/30 text-amber-400"
                          : ing.safetyGrade === "CAUTION"
                          ? "bg-orange-900/30 text-orange-400"
                          : ing.safetyGrade === "HAZARDOUS"
                          ? "bg-red-900/30 text-red-400"
                          : "bg-[#2D3348] text-[#555B6E]"
                      }`}
                    >
                      {ing.safetyGrade}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                        ing.hasKnowledge
                          ? "bg-emerald-900/30 text-emerald-400"
                          : "bg-[#2D3348] text-[#555B6E]"
                      }`}
                    >
                      {ing.hasKnowledge ? "Enriched" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#8B92A5]">
                    {ing.knowledgeUpdatedAt
                      ? new Date(ing.knowledgeUpdatedAt).toLocaleDateString(
                          "ko-KR"
                        )
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleViewDetail(ing.id)}
                      className="text-xs text-blue-400 bg-transparent border-none cursor-pointer hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#2D3348]">
            <span className="text-xs text-[#555B6E]">
              Page {data.page} of {data.totalPages} ({data.total} total)
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded text-xs font-medium bg-[#0F1117] text-[#8B92A5] border-none cursor-pointer disabled:opacity-30 hover:bg-[#2D3348]"
              >
                Prev
              </button>
              <button
                onClick={() =>
                  setPage(Math.min(data.totalPages, page + 1))
                }
                disabled={page >= data.totalPages}
                className="px-3 py-1 rounded text-xs font-medium bg-[#0F1117] text-[#8B92A5] border-none cursor-pointer disabled:opacity-30 hover:bg-[#2D3348]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailId && detailData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-6 w-[600px] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">
                {detailData.nameKo || detailData.nameInci}
              </h3>
              <button
                onClick={() => {
                  setDetailId(null);
                  setDetailData(null);
                }}
                className="text-[#8B92A5] hover:text-white bg-transparent border-none cursor-pointer text-lg"
              >
                X
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-[10px] text-[#555B6E] mb-1">INCI Name</div>
                <div className="text-sm text-white font-mono">
                  {detailData.nameInci}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] text-[#555B6E] mb-1">
                    Safety Grade
                  </div>
                  <div className="text-sm text-white">
                    {detailData.safetyGrade}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#555B6E] mb-1">
                    EWG Score
                  </div>
                  <div className="text-sm text-white">
                    {detailData.ewgScore ?? "N/A"}
                  </div>
                </div>
              </div>

              {detailData.description && (
                <div>
                  <div className="text-[10px] text-[#555B6E] mb-1">
                    Description
                  </div>
                  <div className="text-sm text-[#C8CDD8]">
                    {detailData.description}
                  </div>
                </div>
              )}

              {detailData.knowledgeData && (
                <>
                  <hr className="border-[#2D3348]" />
                  <div className="text-xs font-semibold text-violet-400 mb-2">
                    AI Knowledge Data
                  </div>

                  {(detailData.knowledgeData as any).safetyInfo && (
                    <div>
                      <div className="text-[10px] text-[#555B6E] mb-1">
                        Safety Info
                      </div>
                      <div className="text-sm text-[#C8CDD8]">
                        {(detailData.knowledgeData as any).safetyInfo}
                      </div>
                    </div>
                  )}

                  {(detailData.knowledgeData as any).commonUses?.length > 0 && (
                    <div>
                      <div className="text-[10px] text-[#555B6E] mb-1">
                        Common Uses
                      </div>
                      <ul className="text-sm text-[#C8CDD8] list-disc pl-4 space-y-0.5">
                        {(
                          (detailData.knowledgeData as any).commonUses as string[]
                        ).map((u: string, i: number) => (
                          <li key={i}>{u}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(detailData.knowledgeData as any).skinTypeRecommendations
                    ?.length > 0 && (
                    <div>
                      <div className="text-[10px] text-[#555B6E] mb-1">
                        Skin Type Recommendations
                      </div>
                      <div className="space-y-1">
                        {(
                          (detailData.knowledgeData as any)
                            .skinTypeRecommendations as any[]
                        ).map((r: any, i: number) => (
                          <div key={i} className="text-sm text-[#C8CDD8]">
                            <span className="font-semibold text-white">
                              {r.skinType}:
                            </span>{" "}
                            {r.recommendation}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(detailData.knowledgeData as any).scientificEvidence && (
                    <div>
                      <div className="text-[10px] text-[#555B6E] mb-1">
                        Scientific Evidence
                      </div>
                      <div className="text-sm text-[#C8CDD8]">
                        {(detailData.knowledgeData as any).scientificEvidence}
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-[#555B6E] mt-2">
                    Last enriched:{" "}
                    {detailData.knowledgeUpdatedAt
                      ? new Date(
                          detailData.knowledgeUpdatedAt
                        ).toLocaleString("ko-KR")
                      : "N/A"}
                  </div>
                </>
              )}

              {!detailData.knowledgeData && (
                <div className="text-sm text-[#555B6E] italic">
                  No AI knowledge data available. Select this ingredient and
                  click &quot;Enrich&quot; to generate.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
