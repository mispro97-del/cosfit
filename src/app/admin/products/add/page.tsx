"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  parseIngredients,
  searchIngredientsForMapping,
  getBrands,
  addProduct,
  type ParsedIngredient,
  type BrandOption,
} from "../actions";

// ── Constants ──

const CATEGORIES = [
  { value: "CLEANSER", label: "클렌저" },
  { value: "TONER", label: "토너" },
  { value: "SERUM", label: "세럼" },
  { value: "EMULSION", label: "에멀전" },
  { value: "CREAM", label: "크림" },
  { value: "SUNSCREEN", label: "선크림" },
  { value: "MASK", label: "마스크" },
  { value: "EYE_CARE", label: "아이케어" },
  { value: "LIP_CARE", label: "립케어" },
  { value: "BODY_CARE", label: "바디케어" },
  { value: "MAKEUP_BASE", label: "메이크업 베이스" },
  { value: "OTHER", label: "기타" },
];

const SAFETY_COLORS: Record<string, string> = {
  SAFE: "text-green-400",
  MODERATE: "text-yellow-400",
  CAUTION: "text-orange-400",
  HAZARDOUS: "text-red-400",
  UNKNOWN: "text-gray-400",
};

const SAFETY_LABELS: Record<string, string> = {
  SAFE: "안전",
  MODERATE: "보통",
  CAUTION: "주의",
  HAZARDOUS: "위험",
  UNKNOWN: "미분류",
};

export default function AddProductPage() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState("");
  const [brandMode, setBrandMode] = useState<"existing" | "new">("existing");
  const [brandId, setBrandId] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Brands
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);

  // Ingredients
  const [rawText, setRawText] = useState("");
  const [parsedIngredients, setParsedIngredients] = useState<ParsedIngredient[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Manual mapping
  const [mappingIndex, setMappingIndex] = useState<number | null>(null);
  const [mappingQuery, setMappingQuery] = useState("");
  const [mappingResults, setMappingResults] = useState<
    { id: string; nameInci: string; nameKo: string | null; safetyGrade: string }[]
  >([]);
  const [mappingSearching, setMappingSearching] = useState(false);
  const mappingDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Load brands on mount
  useEffect(() => {
    (async () => {
      const result = await getBrands();
      if (result.success && result.data) {
        setBrands(result.data);
      }
      setBrandsLoading(false);
    })();
  }, []);

  // Parse ingredients
  async function handleParse() {
    if (!rawText.trim()) return;
    setIsParsing(true);
    setParseError(null);

    const result = await parseIngredients(rawText);
    if (result.success && result.data) {
      setParsedIngredients(result.data);
    } else {
      setParseError(result.error ?? "파싱 실패");
    }
    setIsParsing(false);
  }

  // Manual mapping search with debounce
  function handleMappingSearch(query: string) {
    setMappingQuery(query);

    if (mappingDebounceRef.current) {
      clearTimeout(mappingDebounceRef.current);
    }

    if (!query.trim()) {
      setMappingResults([]);
      return;
    }

    mappingDebounceRef.current = setTimeout(async () => {
      setMappingSearching(true);
      const result = await searchIngredientsForMapping(query);
      if (result.success && result.data) {
        setMappingResults(result.data);
      }
      setMappingSearching(false);
    }, 300);
  }

  // Select mapping
  function selectMapping(
    ingredientIndex: number,
    match: { id: string; nameInci: string; nameKo: string | null; safetyGrade: string }
  ) {
    setParsedIngredients((prev) =>
      prev.map((p) =>
        p.index === ingredientIndex
          ? {
              ...p,
              matchedId: match.id,
              matchedNameInci: match.nameInci,
              matchedNameKo: match.nameKo,
              matchedSafetyGrade: match.safetyGrade,
              isMatched: true,
            }
          : p
      )
    );
    setMappingIndex(null);
    setMappingQuery("");
    setMappingResults([]);
  }

  // Clear mapping
  function clearMapping(ingredientIndex: number) {
    setParsedIngredients((prev) =>
      prev.map((p) =>
        p.index === ingredientIndex
          ? {
              ...p,
              matchedId: null,
              matchedNameInci: null,
              matchedNameKo: null,
              matchedSafetyGrade: null,
              isMatched: false,
            }
          : p
      )
    );
  }

  // Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    const result = await addProduct({
      name,
      brandId: brandMode === "existing" ? brandId : "",
      newBrandName: brandMode === "new" ? newBrandName : undefined,
      category,
      imageUrl: imageUrl || undefined,
      rawIngredients: rawText,
      ingredients: parsedIngredients.map((p) => ({
        rawName: p.rawName,
        ingredientId: p.matchedId,
        orderIndex: p.index,
      })),
    });

    if (result.success) {
      setSubmitSuccess(true);
      setTimeout(() => {
        router.push("/admin/products");
      }, 1500);
    } else {
      setSubmitError(result.error ?? "제품 추가 실패");
    }
    setSubmitting(false);
  }

  const matchedCount = parsedIngredients.filter((p) => p.isMatched).length;
  const unmatchedCount = parsedIngredients.filter((p) => !p.isMatched).length;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/products"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2A2E42] bg-[#1E2130] text-[#8B92A5] hover:bg-[#2A2E42] hover:text-white transition-colors no-underline"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">제품 추가</h1>
          <p className="text-sm text-[#8B92A5] mt-1">
            수동으로 제품 정보와 전성분을 입력합니다
          </p>
        </div>
      </div>

      {/* Success */}
      {submitSuccess && (
        <div className="rounded-lg border border-green-800 bg-green-900/30 px-4 py-3 text-sm text-green-300">
          제품이 성공적으로 추가되었습니다. 목록으로 이동합니다...
        </div>
      )}

      {/* Error */}
      {submitError && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Section 1: 기본 정보 ── */}
        <div className="rounded-xl border border-[#1E2130] bg-[#141620] p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">기본 정보</h2>

          {/* 제품명 */}
          <div>
            <label className="block text-sm font-medium text-[#8B92A5] mb-1.5">
              제품명 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 닥터지 레드 블레미쉬 클리어 수딩 크림"
              className="w-full rounded-lg border border-[#2A2E42] bg-[#1E2130] px-4 py-2.5 text-sm text-white placeholder-[#555B6E] focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          {/* 브랜드 */}
          <div>
            <label className="block text-sm font-medium text-[#8B92A5] mb-1.5">
              브랜드 <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-3 mb-2">
              <button
                type="button"
                onClick={() => setBrandMode("existing")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  brandMode === "existing"
                    ? "bg-blue-600 text-white"
                    : "bg-[#1E2130] text-[#8B92A5] hover:bg-[#2A2E42]"
                }`}
              >
                기존 브랜드 선택
              </button>
              <button
                type="button"
                onClick={() => setBrandMode("new")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  brandMode === "new"
                    ? "bg-blue-600 text-white"
                    : "bg-[#1E2130] text-[#8B92A5] hover:bg-[#2A2E42]"
                }`}
              >
                새 브랜드 입력
              </button>
            </div>

            {brandMode === "existing" ? (
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full rounded-lg border border-[#2A2E42] bg-[#1E2130] px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                required={brandMode === "existing"}
              >
                <option value="">브랜드 선택...</option>
                {brandsLoading ? (
                  <option disabled>로딩 중...</option>
                ) : (
                  brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nameKo ? `${b.nameKo} (${b.name})` : b.name}
                    </option>
                  ))
                )}
              </select>
            ) : (
              <input
                type="text"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="새 브랜드명 입력"
                className="w-full rounded-lg border border-[#2A2E42] bg-[#1E2130] px-4 py-2.5 text-sm text-white placeholder-[#555B6E] focus:border-blue-500 focus:outline-none"
                required={brandMode === "new"}
              />
            )}
          </div>

          {/* 카테고리 */}
          <div>
            <label className="block text-sm font-medium text-[#8B92A5] mb-1.5">
              카테고리 <span className="text-red-400">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-[#2A2E42] bg-[#1E2130] px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              required
            >
              <option value="">카테고리 선택...</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* 이미지 URL */}
          <div>
            <label className="block text-sm font-medium text-[#8B92A5] mb-1.5">
              이미지 URL <span className="text-[#555B6E]">(선택)</span>
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/product-image.jpg"
              className="w-full rounded-lg border border-[#2A2E42] bg-[#1E2130] px-4 py-2.5 text-sm text-white placeholder-[#555B6E] focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* ── Section 2: 전성분 입력 ── */}
        <div className="rounded-xl border border-[#1E2130] bg-[#141620] p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">전성분 입력</h2>
          <p className="text-sm text-[#555B6E]">
            제품의 전성분 목록을 붙여넣기하세요. 콤마(,), 줄바꿈, 세미콜론(;)으로 구분됩니다.
          </p>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={6}
            placeholder={`예시:\n정제수, 글리세린, 부틸렌글라이콜, 나이아신아마이드, 1,2-헥산다이올\n\n또는:\nWater\nGlycerin\nButylene Glycol\nNiacinamide`}
            className="w-full rounded-lg border border-[#2A2E42] bg-[#1E2130] px-4 py-3 text-sm text-white placeholder-[#555B6E] focus:border-blue-500 focus:outline-none font-mono resize-y"
          />

          <button
            type="button"
            onClick={handleParse}
            disabled={isParsing || !rawText.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isParsing ? "파싱 중..." : "성분 파싱 및 DB 매칭"}
          </button>

          {parseError && (
            <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
              {parseError}
            </div>
          )}
        </div>

        {/* ── Section 3: 파싱 결과 ── */}
        {parsedIngredients.length > 0 && (
          <div className="rounded-xl border border-[#1E2130] bg-[#141620] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                파싱 결과
              </h2>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-green-400">
                  매칭: {matchedCount}
                </span>
                <span className="text-[#555B6E]">|</span>
                <span className={unmatchedCount > 0 ? "text-orange-400" : "text-[#555B6E]"}>
                  미매칭: {unmatchedCount}
                </span>
                <span className="text-[#555B6E]">|</span>
                <span className="text-[#8B92A5]">
                  전체: {parsedIngredients.length}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full bg-[#1E2130] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                style={{
                  width: `${(matchedCount / parsedIngredients.length) * 100}%`,
                }}
              />
            </div>

            {/* Ingredient list */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {parsedIngredients.map((ing) => (
                <div
                  key={ing.index}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm border transition-colors ${
                    ing.isMatched
                      ? "border-green-900/50 bg-green-900/10"
                      : "border-orange-900/50 bg-orange-900/10"
                  }`}
                >
                  {/* Index */}
                  <span className="text-xs text-[#555B6E] w-6 text-right shrink-0">
                    {ing.index + 1}.
                  </span>

                  {/* Raw name */}
                  <span className="text-white font-medium min-w-[120px] shrink-0">
                    {ing.rawName}
                  </span>

                  {/* Arrow */}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="text-[#555B6E] shrink-0"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>

                  {/* Match result */}
                  {ing.isMatched ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-green-400 truncate">
                        {ing.matchedNameInci}
                      </span>
                      {ing.matchedNameKo && (
                        <span className="text-[#555B6E] text-xs truncate">
                          ({ing.matchedNameKo})
                        </span>
                      )}
                      {ing.matchedSafetyGrade && (
                        <span
                          className={`text-xs font-medium ${
                            SAFETY_COLORS[ing.matchedSafetyGrade] ?? "text-gray-400"
                          }`}
                        >
                          [{SAFETY_LABELS[ing.matchedSafetyGrade] ?? ing.matchedSafetyGrade}]
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => clearMapping(ing.index)}
                        className="ml-auto text-xs text-[#555B6E] hover:text-red-400 transition-colors shrink-0"
                      >
                        해제
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-orange-400 text-xs">미매칭</span>
                      <button
                        type="button"
                        onClick={() => {
                          setMappingIndex(ing.index);
                          setMappingQuery("");
                          setMappingResults([]);
                        }}
                        className="ml-auto text-xs text-blue-400 hover:text-blue-300 transition-colors shrink-0"
                      >
                        수동 매핑
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Manual mapping modal */}
            {mappingIndex !== null && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="w-full max-w-lg rounded-xl border border-[#1E2130] bg-[#141620] p-6 space-y-4 mx-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">
                      수동 성분 매핑
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setMappingIndex(null);
                        setMappingQuery("");
                        setMappingResults([]);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8B92A5] hover:bg-[#1E2130] hover:text-white transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="rounded-lg bg-[#1E2130] px-3 py-2 text-sm">
                    <span className="text-[#555B6E]">원본 성분명: </span>
                    <span className="text-white font-medium">
                      {parsedIngredients.find((p) => p.index === mappingIndex)?.rawName}
                    </span>
                  </div>

                  <input
                    type="text"
                    value={mappingQuery}
                    onChange={(e) => handleMappingSearch(e.target.value)}
                    placeholder="성분명 검색 (INCI / 한국명 / 동의어)"
                    className="w-full rounded-lg border border-[#2A2E42] bg-[#1E2130] px-4 py-2.5 text-sm text-white placeholder-[#555B6E] focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />

                  {mappingSearching && (
                    <div className="text-sm text-[#555B6E] text-center py-2">검색 중...</div>
                  )}

                  {mappingResults.length > 0 && (
                    <div className="space-y-1 max-h-[300px] overflow-y-auto">
                      {mappingResults.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => selectMapping(mappingIndex, r)}
                          className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-left hover:bg-[#1E2130] transition-colors"
                        >
                          <span className="text-white font-medium">{r.nameInci}</span>
                          {r.nameKo && (
                            <span className="text-[#555B6E]">({r.nameKo})</span>
                          )}
                          <span
                            className={`ml-auto text-xs font-medium ${
                              SAFETY_COLORS[r.safetyGrade] ?? "text-gray-400"
                            }`}
                          >
                            {SAFETY_LABELS[r.safetyGrade] ?? r.safetyGrade}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {mappingQuery && !mappingSearching && mappingResults.length === 0 && (
                    <div className="text-sm text-[#555B6E] text-center py-4">
                      검색 결과가 없습니다. 성분 관리에서 먼저 등록해주세요.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Submit ── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/products"
            className="rounded-lg border border-[#2A2E42] bg-[#1E2130] px-5 py-2.5 text-sm font-medium text-[#8B92A5] hover:bg-[#2A2E42] hover:text-white transition-colors no-underline"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={submitting || submitSuccess || !name || !category || (!brandId && !newBrandName)}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "저장 중..." : submitSuccess ? "저장 완료" : "제품 저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
