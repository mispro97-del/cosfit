"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getIngredientDetail,
  addSynonym,
  removeSynonym,
  addInteraction,
  removeInteraction,
  searchIngredients,
  type IngredientDetail,
  type SynonymItem,
  type InteractionItem,
} from "../actions";

// ── Constants ──

const SAFETY_GRADE_COLORS: Record<string, string> = {
  SAFE: "bg-green-900/40 text-green-300 border-green-800",
  MODERATE: "bg-yellow-900/40 text-yellow-300 border-yellow-800",
  CAUTION: "bg-orange-900/40 text-orange-300 border-orange-800",
  HAZARDOUS: "bg-red-900/40 text-red-300 border-red-800",
  UNKNOWN: "bg-gray-700/40 text-gray-400 border-gray-600",
};

const SAFETY_GRADE_LABELS: Record<string, string> = {
  SAFE: "안전",
  MODERATE: "보통",
  CAUTION: "주의",
  HAZARDOUS: "위험",
  UNKNOWN: "미분류",
};

const INTERACTION_TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  SYNERGY: { bg: "bg-green-900/40", text: "text-green-300", label: "시너지" },
  CONFLICT: { bg: "bg-red-900/40", text: "text-red-300", label: "충돌" },
  NEUTRAL: { bg: "bg-gray-700/40", text: "text-gray-400", label: "중립" },
};

const LANGUAGE_OPTIONS = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "영어" },
  { value: "inci", label: "INCI" },
];

// ── Component ──

export default function IngredientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [detail, setDetail] = useState<IngredientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Synonym form
  const [synForm, setSynForm] = useState({ synonym: "", language: "ko" });
  const [synLoading, setSynLoading] = useState(false);
  const [synError, setSynError] = useState<string | null>(null);

  // Interaction form
  const [intForm, setIntForm] = useState({
    ingredientBId: "",
    ingredientBName: "",
    type: "SYNERGY",
    description: "",
    severity: 1,
  });
  const [intLoading, setIntLoading] = useState(false);
  const [intError, setIntError] = useState<string | null>(null);

  // Ingredient search for interaction
  const [intSearchQuery, setIntSearchQuery] = useState("");
  const [intSearchResults, setIntSearchResults] = useState<{ id: string; nameInci: string; nameKo: string | null }[]>([]);
  const [intSearchOpen, setIntSearchOpen] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getIngredientDetail(id);
    if (result.success && result.data) {
      setDetail(result.data);
    } else {
      setError(result.error ?? "데이터를 불러올 수 없습니다.");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIntSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Handlers ──

  async function handleAddSynonym(e: React.FormEvent) {
    e.preventDefault();
    setSynLoading(true);
    setSynError(null);
    const result = await addSynonym(id, synForm.synonym, synForm.language);
    if (result.success && result.data) {
      setDetail((prev) =>
        prev ? { ...prev, synonyms: [...prev.synonyms, result.data!] } : prev
      );
      setSynForm({ synonym: "", language: "ko" });
    } else {
      setSynError(result.error ?? "추가 실패");
    }
    setSynLoading(false);
  }

  async function handleRemoveSynonym(synId: string) {
    if (!confirm("이 동의어를 삭제하시겠습니까?")) return;
    const result = await removeSynonym(synId);
    if (result.success) {
      setDetail((prev) =>
        prev ? { ...prev, synonyms: prev.synonyms.filter((s) => s.id !== synId) } : prev
      );
    } else {
      alert(result.error ?? "삭제 실패");
    }
  }

  function handleIngredientSearch(query: string) {
    setIntSearchQuery(query);
    setIntForm((f) => ({ ...f, ingredientBId: "", ingredientBName: "" }));

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim()) {
      setIntSearchResults([]);
      setIntSearchOpen(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      const result = await searchIngredients(query);
      if (result.success && result.data) {
        // Exclude current ingredient
        setIntSearchResults(result.data.filter((r) => r.id !== id));
        setIntSearchOpen(true);
      }
    }, 300);
  }

  function selectSearchResult(item: { id: string; nameInci: string; nameKo: string | null }) {
    setIntForm((f) => ({ ...f, ingredientBId: item.id, ingredientBName: item.nameInci }));
    setIntSearchQuery(item.nameKo ? `${item.nameInci} (${item.nameKo})` : item.nameInci);
    setIntSearchOpen(false);
    setIntSearchResults([]);
  }

  async function handleAddInteraction(e: React.FormEvent) {
    e.preventDefault();
    if (!intForm.ingredientBId) {
      setIntError("상대 성분을 선택해주세요.");
      return;
    }
    setIntLoading(true);
    setIntError(null);
    const result = await addInteraction(
      id,
      intForm.ingredientBId,
      intForm.type,
      intForm.description,
      intForm.type === "CONFLICT" ? intForm.severity : null
    );
    if (result.success && result.data) {
      setDetail((prev) =>
        prev ? { ...prev, interactions: [...prev.interactions, result.data!] } : prev
      );
      setIntForm({ ingredientBId: "", ingredientBName: "", type: "SYNERGY", description: "", severity: 1 });
      setIntSearchQuery("");
    } else {
      setIntError(result.error ?? "추가 실패");
    }
    setIntLoading(false);
  }

  async function handleRemoveInteraction(intId: string) {
    if (!confirm("이 상호작용을 삭제하시겠습니까?")) return;
    const result = await removeInteraction(intId);
    if (result.success) {
      setDetail((prev) =>
        prev ? { ...prev, interactions: prev.interactions.filter((i) => i.id !== intId) } : prev
      );
    } else {
      alert(result.error ?? "삭제 실패");
    }
  }

  // ── Render ──

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-[#555B6E]">로딩 중...</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {error ?? "성분 정보를 찾을 수 없습니다."}
        </div>
        <button
          onClick={() => router.push("/admin/ingredients")}
          className="mt-4 text-sm text-blue-400 hover:text-blue-300"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const gradeStyle = SAFETY_GRADE_COLORS[detail.safetyGrade] ?? SAFETY_GRADE_COLORS.UNKNOWN;
  const gradeLabel = SAFETY_GRADE_LABELS[detail.safetyGrade] ?? detail.safetyGrade;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Back + Title */}
      <div>
        <button
          onClick={() => router.push("/admin/ingredients")}
          className="text-sm text-[#8B92A5] hover:text-white transition-colors mb-3 flex items-center gap-1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          성분 목록
        </button>
        <h1 className="text-2xl font-bold text-white">{detail.nameInci}</h1>
        {detail.nameKo && <p className="text-[#8B92A5] mt-1">{detail.nameKo}</p>}
      </div>

      {/* Basic Info Card */}
      <div className="rounded-xl border border-[#1E2130] bg-[#141620] p-5">
        <h2 className="text-sm font-semibold uppercase text-[#555B6E] mb-4">기본 정보</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <InfoRow label="INCI명" value={detail.nameInci} />
          <InfoRow label="한국명" value={detail.nameKo ?? "-"} />
          <InfoRow label="영문명" value={detail.nameEn ?? "-"} />
          <InfoRow label="CAS 번호" value={detail.casNumber ?? "-"} />
          <InfoRow label="카테고리" value={detail.category ?? "-"} />
          <InfoRow label="기능" value={detail.function.length > 0 ? detail.function.join(", ") : "-"} />
          <div>
            <span className="text-[#555B6E]">안전등급</span>
            <div className="mt-1">
              <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-semibold ${gradeStyle}`}>
                {gradeLabel}
              </span>
            </div>
          </div>
          <InfoRow label="EWG 점수" value={detail.ewgScore != null ? String(detail.ewgScore) : "-"} />
          <InfoRow label="알레르겐" value={detail.commonAllergen ? "Yes" : "No"} />
          <InfoRow label="CosDNA 자극" value={detail.cosDnaIrritant != null ? String(detail.cosDnaIrritant) : "-"} />
          <InfoRow label="CosDNA 안전" value={detail.cosDnaSafety != null ? String(detail.cosDnaSafety) : "-"} />
        </div>
        {detail.description && (
          <div className="mt-4 pt-4 border-t border-[#1E2130]">
            <span className="text-[#555B6E] text-sm">설명</span>
            <p className="text-[#8B92A5] text-sm mt-1">{detail.description}</p>
          </div>
        )}
      </div>

      {/* Synonyms Section */}
      <div className="rounded-xl border border-[#1E2130] bg-[#141620] p-5">
        <h2 className="text-sm font-semibold uppercase text-[#555B6E] mb-4">
          동의어 ({detail.synonyms.length})
        </h2>

        {/* Synonym List */}
        {detail.synonyms.length > 0 ? (
          <div className="space-y-2 mb-4">
            {detail.synonyms.map((syn) => (
              <div
                key={syn.id}
                className="flex items-center justify-between rounded-lg border border-[#1E2130] bg-[#0F1117] px-4 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded bg-[#1E2130] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#8B92A5]">
                    {syn.language}
                  </span>
                  <span className="text-sm text-white">{syn.synonym}</span>
                  {syn.source && (
                    <span className="text-xs text-[#555B6E]">({syn.source})</span>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveSynonym(syn.id)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  title="삭제"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#555B6E] mb-4">등록된 동의어가 없습니다.</p>
        )}

        {/* Add Synonym Form */}
        <form onSubmit={handleAddSynonym} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-[#555B6E] mb-1">동의어</label>
            <input
              type="text"
              value={synForm.synonym}
              onChange={(e) => setSynForm((f) => ({ ...f, synonym: e.target.value }))}
              placeholder="동의어 입력"
              required
              className="w-full rounded-lg border border-[#2A2E42] bg-[#1E2130] px-3 py-2 text-sm text-white placeholder-[#555B6E] focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs text-[#555B6E] mb-1">언어</label>
            <select
              value={synForm.language}
              onChange={(e) => setSynForm((f) => ({ ...f, language: e.target.value }))}
              className="w-full rounded-lg border border-[#2A2E42] bg-[#1E2130] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={synLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {synLoading ? "추가 중..." : "추가"}
          </button>
        </form>
        {synError && (
          <p className="mt-2 text-xs text-red-400">{synError}</p>
        )}
      </div>

      {/* Interactions Section */}
      <div className="rounded-xl border border-[#1E2130] bg-[#141620] p-5">
        <h2 className="text-sm font-semibold uppercase text-[#555B6E] mb-4">
          상호작용 ({detail.interactions.length})
        </h2>

        {/* Interaction List */}
        {detail.interactions.length > 0 ? (
          <div className="space-y-2 mb-4">
            {detail.interactions.map((inter) => {
              const style = INTERACTION_TYPE_STYLES[inter.interactionType] ?? INTERACTION_TYPE_STYLES.NEUTRAL;
              const otherName =
                inter.ingredientAId === id ? inter.ingredientBName : inter.ingredientAName;

              return (
                <div
                  key={inter.id}
                  className={`flex items-start justify-between rounded-lg border border-[#1E2130] px-4 py-3 ${style.bg}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${style.text}`}>
                        {style.label}
                      </span>
                      <span className="text-sm font-medium text-white">{otherName}</span>
                      {inter.severity != null && inter.interactionType === "CONFLICT" && (
                        <span className="text-xs text-red-400">
                          심각도 {inter.severity}/5
                        </span>
                      )}
                    </div>
                    {inter.description && (
                      <p className="text-xs text-[#8B92A5]">{inter.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveInteraction(inter.id)}
                    className="ml-3 mt-0.5 flex-shrink-0 text-red-400 hover:text-red-300 transition-colors"
                    title="삭제"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[#555B6E] mb-4">등록된 상호작용이 없습니다.</p>
        )}

        {/* Add Interaction Form */}
        <form onSubmit={handleAddInteraction} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Ingredient Search */}
            <div className="relative" ref={searchRef}>
              <label className="block text-xs text-[#555B6E] mb-1">상대 성분</label>
              <input
                type="text"
                value={intSearchQuery}
                onChange={(e) => handleIngredientSearch(e.target.value)}
                placeholder="성분명 검색..."
                className="w-full rounded-lg border border-[#2A2E42] bg-[#1E2130] px-3 py-2 text-sm text-white placeholder-[#555B6E] focus:border-blue-500 focus:outline-none"
              />
              {intForm.ingredientBId && (
                <span className="absolute right-3 top-[30px] text-green-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
              {intSearchOpen && intSearchResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-[#2A2E42] bg-[#1E2130] shadow-lg max-h-48 overflow-y-auto">
                  {intSearchResults.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => selectSearchResult(r)}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#2A2E42] transition-colors"
                    >
                      {r.nameInci}
                      {r.nameKo && <span className="text-[#555B6E] ml-2">({r.nameKo})</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs text-[#555B6E] mb-1">타입</label>
              <select
                value={intForm.type}
                onChange={(e) => setIntForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full rounded-lg border border-[#2A2E42] bg-[#1E2130] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="SYNERGY">시너지 (SYNERGY)</option>
                <option value="CONFLICT">충돌 (CONFLICT)</option>
                <option value="NEUTRAL">중립 (NEUTRAL)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Description */}
            <div>
              <label className="block text-xs text-[#555B6E] mb-1">설명</label>
              <input
                type="text"
                value={intForm.description}
                onChange={(e) => setIntForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="상호작용 설명 (선택)"
                className="w-full rounded-lg border border-[#2A2E42] bg-[#1E2130] px-3 py-2 text-sm text-white placeholder-[#555B6E] focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Severity (only for CONFLICT) */}
            {intForm.type === "CONFLICT" && (
              <div>
                <label className="block text-xs text-[#555B6E] mb-1">심각도 (1-5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={intForm.severity}
                  onChange={(e) => setIntForm((f) => ({ ...f, severity: Math.min(5, Math.max(1, parseInt(e.target.value) || 1)) }))}
                  className="w-full rounded-lg border border-[#2A2E42] bg-[#1E2130] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={intLoading || !intForm.ingredientBId}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {intLoading ? "추가 중..." : "상호작용 추가"}
            </button>
            {intError && <span className="text-xs text-red-400">{intError}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Sub-components ──

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[#555B6E]">{label}</span>
      <p className="text-white mt-0.5">{value}</p>
    </div>
  );
}
