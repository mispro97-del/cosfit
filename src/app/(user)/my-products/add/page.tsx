"use client";

import { useState, useCallback, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { searchProducts, addUserProduct, type SearchProductItem } from "../actions";

const CATEGORY_LABELS: Record<string, string> = {
  CLEANSER: "클렌저",
  TONER: "토너",
  SERUM: "세럼",
  EMULSION: "에멀전",
  CREAM: "크림",
  SUNSCREEN: "선크림",
  MASK: "마스크",
  EYE_CARE: "아이케어",
  LIP_CARE: "립케어",
  BODY_CARE: "바디케어",
  MAKEUP_BASE: "메이크업베이스",
  OTHER: "기타",
};

type RoutineType = "MORNING" | "EVENING" | "BOTH";
type TabType = "search" | "barcode" | "photo";

interface RecognizedProduct {
  name: string | null;
  brand: string | null;
}

interface ScanMatch {
  id: string;
  name: string;
  brand: string;
  brandId: string;
  category: string;
  imageUrl: string | null;
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="p-0.5 bg-transparent border-none cursor-pointer transition-transform hover:scale-110"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill={star <= value ? "#F59E0B" : "none"}
            stroke={star <= value ? "#F59E0B" : "#D1D5DB"}
            strokeWidth={1.5}
          >
            <polygon
              points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

// ── Tab Button Component ──
function TabButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-colors border-none cursor-pointer"
      style={{
        backgroundColor: active ? "#10B981" : "#F3F4F6",
        color: active ? "#FFFFFF" : "#6B7280",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Product Card Component ──
function ProductCard({
  product,
  onSelect,
}: {
  product: ScanMatch | SearchProductItem;
  onSelect: () => void;
}) {
  const brandName = "brandName" in product ? product.brandName : product.brand;
  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-2xl bg-white p-4 border-none cursor-pointer hover:shadow-md transition-shadow"
      style={{ border: "1px solid #E5E7EB" }}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#F3F4F6] flex items-center justify-center shrink-0 overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={1.5}>
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#6B7280]">{brandName}</p>
          <p className="text-sm font-semibold text-[#1F2937] truncate">{product.name}</p>
          <span
            className="inline-block px-2 py-0.5 rounded-md text-[10px] font-medium mt-1"
            style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}
          >
            {CATEGORY_LABELS[product.category] || product.category}
          </span>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2}>
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </div>
    </button>
  );
}

export default function AddProductPage() {
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("search");

  // Search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchProductItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Barcode state
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeScanning, setBarcodeScanning] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<ScanMatch | null>(null);
  const [barcodeNotFound, setBarcodeNotFound] = useState(false);

  // Photo state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [recognized, setRecognized] = useState<RecognizedProduct | null>(null);
  const [photoMatches, setPhotoMatches] = useState<ScanMatch[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Selected product state
  const [selectedProduct, setSelectedProduct] = useState<SearchProductItem | null>(null);

  // Form state
  const [routineType, setRoutineType] = useState<RoutineType>("BOTH");
  const [usagePeriod, setUsagePeriod] = useState<string>("");
  const [rating, setRating] = useState<number>(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Search handlers ──
  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 1) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const result = await searchProducts(value.trim());
      if (result.success && result.data) {
        setSearchResults(result.data);
      } else {
        setSearchResults([]);
      }
      setHasSearched(true);
      setSearching(false);
    }, 300);
  }, []);

  // ── Barcode handlers ──
  const handleBarcodeScan = async () => {
    if (!barcodeInput.trim()) return;

    setBarcodeScanning(true);
    setBarcodeResult(null);
    setBarcodeNotFound(false);
    setError(null);

    try {
      const res = await fetch("/api/v1/products/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: barcodeInput.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "바코드 스캔에 실패했습니다.");
        return;
      }

      if (data.data?.found) {
        setBarcodeResult(data.data.product);
      } else {
        setBarcodeNotFound(true);
      }
    } catch {
      setError("바코드 스캔 중 오류가 발생했습니다.");
    } finally {
      setBarcodeScanning(false);
    }
  };

  // ── Photo handlers ──
  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 5MB 제한
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("이미지 크기가 5MB를 초과합니다.");
      return;
    }

    setImageFile(file);
    setPhotoError(null);
    setRecognized(null);
    setPhotoMatches([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAIRecognize = async () => {
    if (!imageFile || !imagePreview) return;

    setRecognizing(true);
    setPhotoError(null);
    setRecognized(null);
    setPhotoMatches([]);

    try {
      // data:image/...;base64, 프리픽스 제거
      const base64 = imagePreview.split(",")[1];

      const res = await fetch("/api/v1/products/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPhotoError(data.error?.message || "AI 인식에 실패했습니다.");
        return;
      }

      setRecognized(data.data.recognized);
      setPhotoMatches(data.data.matches);

      if (!data.data.recognized?.name && !data.data.recognized?.brand) {
        setPhotoError("이미지에서 제품을 인식하지 못했습니다. 다른 이미지를 시도해주세요.");
      }
    } catch {
      setPhotoError("이미지 인식 중 오류가 발생했습니다.");
    } finally {
      setRecognizing(false);
    }
  };

  // ── Common handlers ──
  const handleSelect = (product: SearchProductItem | ScanMatch) => {
    const normalized: SearchProductItem = {
      id: product.id,
      name: product.name,
      brandName: "brandName" in product ? product.brandName : product.brand,
      category: product.category,
      imageUrl: product.imageUrl,
    };
    setSelectedProduct(normalized);
    setQuery("");
    setSearchResults([]);
    setHasSearched(false);
    setError(null);
  };

  const handleDeselect = () => {
    setSelectedProduct(null);
    setRoutineType("BOTH");
    setUsagePeriod("");
    setRating(0);
    setReview("");
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedProduct) {
      setError("제품을 선택해주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await addUserProduct(selectedProduct.id, {
      routineType,
      usagePeriod: usagePeriod ? parseInt(usagePeriod, 10) : undefined,
      rating: rating > 0 ? rating : undefined,
      review: review.trim() || undefined,
    });

    if (result.success) {
      router.push("/my-products");
    } else {
      setError(result.error || "등록에 실패했습니다.");
      setSubmitting(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setError(null);
  };

  return (
    <div className="pb-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl bg-[#F3F4F6] border-none cursor-pointer hover:bg-[#E5E7EB] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth={2}>
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-xl font-extrabold text-[#1F2937]">제품 추가</h1>
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-xl px-4 py-3 mb-4 text-sm font-medium"
          style={{ backgroundColor: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}
        >
          {error}
        </div>
      )}

      {/* Selected Product */}
      {selectedProduct ? (
        <>
          {/* Selected product card */}
          <div
            className="rounded-2xl bg-white p-4 mb-6"
            style={{ border: "2px solid #10B981", boxShadow: "0 0 0 3px rgba(16,185,129,0.1)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-[#F3F4F6] flex items-center justify-center shrink-0 overflow-hidden">
                {selectedProduct.imageUrl ? (
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={1.5}>
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#6B7280]">{selectedProduct.brandName}</p>
                <p className="text-sm font-semibold text-[#1F2937] truncate">{selectedProduct.name}</p>
                <span
                  className="inline-block px-2 py-0.5 rounded-md text-[10px] font-medium mt-1"
                  style={{ backgroundColor: "#ECFDF5", color: "#059669" }}
                >
                  {CATEGORY_LABELS[selectedProduct.category] || selectedProduct.category}
                </span>
              </div>
              <button
                onClick={handleDeselect}
                className="p-1.5 rounded-lg bg-transparent border-none cursor-pointer hover:bg-[#F3F4F6] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2}>
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Additional Info Form */}
          <div className="space-y-5">
            {/* Routine Type */}
            <div>
              <label className="block text-sm font-semibold text-[#1F2937] mb-2.5">루틴 타입</label>
              <div className="flex gap-2">
                {([
                  { value: "MORNING", label: "아침" },
                  { value: "EVENING", label: "저녁" },
                  { value: "BOTH", label: "아침/저녁" },
                ] as { value: RoutineType; label: string }[]).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRoutineType(value)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors border-none cursor-pointer"
                    style={{
                      backgroundColor: routineType === value ? "#10B981" : "#F3F4F6",
                      color: routineType === value ? "#FFFFFF" : "#6B7280",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Usage Period */}
            <div>
              <label className="block text-sm font-semibold text-[#1F2937] mb-2.5">사용 기간 (개월)</label>
              <input
                type="number"
                min="1"
                max="120"
                value={usagePeriod}
                onChange={(e) => setUsagePeriod(e.target.value)}
                placeholder="예: 3"
                className="w-full px-4 py-3 rounded-xl text-sm bg-white outline-none transition-colors"
                style={{ border: "1px solid #E5E7EB" }}
                onFocus={(e) => (e.target.style.borderColor = "#10B981")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
              />
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-semibold text-[#1F2937] mb-2.5">별점</label>
              <StarInput value={rating} onChange={setRating} />
            </div>

            {/* Review */}
            <div>
              <label className="block text-sm font-semibold text-[#1F2937] mb-2.5">한줄평</label>
              <input
                type="text"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="이 제품에 대한 간단한 후기를 남겨주세요"
                maxLength={100}
                className="w-full px-4 py-3 rounded-xl text-sm bg-white outline-none transition-colors"
                style={{ border: "1px solid #E5E7EB" }}
                onFocus={(e) => (e.target.style.borderColor = "#10B981")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
              />
              <p className="text-[11px] text-[#9CA3AF] mt-1 text-right">{review.length}/100</p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3.5 rounded-xl text-base font-bold text-white border-none cursor-pointer transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#10B981" }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                  />
                  등록 중...
                </span>
              ) : (
                "제품 등록하기"
              )}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4">
            <TabButton
              active={activeTab === "search"}
              label="검색"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
              }
              onClick={() => handleTabChange("search")}
            />
            <TabButton
              active={activeTab === "barcode"}
              label="바코드"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 5v14M7 5v14M10 5v14M14 5v14M17 5v14M21 5v14" strokeLinecap="round" />
                </svg>
              }
              onClick={() => handleTabChange("barcode")}
            />
            <TabButton
              active={activeTab === "photo"}
              label="사진"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              onClick={() => handleTabChange("photo")}
            />
          </div>

          {/* ══════════════ Search Tab ══════════════ */}
          {activeTab === "search" && (
            <>
              <div className="relative mb-4">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2}>
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="제품명 또는 브랜드로 검색"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm bg-white outline-none transition-colors"
                  style={{ border: "1px solid #E5E7EB" }}
                  onFocus={(e) => (e.target.style.borderColor = "#10B981")}
                  onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                  autoFocus
                />
                {searching && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <div
                      className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: "#10B981", borderTopColor: "transparent" }}
                    />
                  </div>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-[#6B7280] mb-1">
                    검색 결과 {searchResults.length}건
                  </p>
                  {searchResults.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={() => handleSelect(product)}
                    />
                  ))}
                </div>
              )}

              {/* No Results */}
              {hasSearched && !searching && searchResults.length === 0 && query.trim().length > 0 && (
                <div className="rounded-2xl bg-white p-8 text-center" style={{ border: "1px solid #E5E7EB" }}>
                  <div className="w-12 h-12 rounded-full bg-[#F3F4F6] flex items-center justify-center mx-auto mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={1.8}>
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-sm text-[#6B7280]">검색 결과가 없습니다</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">다른 검색어로 시도해보세요</p>
                </div>
              )}

              {/* Initial State */}
              {!hasSearched && !searching && query.trim().length === 0 && (
                <div className="rounded-2xl bg-[#F9FAFB] p-6 text-center mt-4" style={{ border: "1px dashed #D1D5DB" }}>
                  <div className="w-12 h-12 rounded-full bg-[#ECFDF5] flex items-center justify-center mx-auto mb-3">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={1.8}>
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#4B5563]">제품을 검색해주세요</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">제품명 또는 브랜드명으로 검색할 수 있습니다</p>
                </div>
              )}
            </>
          )}

          {/* ══════════════ Barcode Tab ══════════════ */}
          {activeTab === "barcode" && (
            <>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => {
                    setBarcodeInput(e.target.value.replace(/\D/g, ""));
                    setBarcodeNotFound(false);
                    setBarcodeResult(null);
                  }}
                  placeholder="바코드 번호 입력 (8~14자리)"
                  maxLength={14}
                  inputMode="numeric"
                  className="flex-1 px-4 py-3.5 rounded-xl text-sm bg-white outline-none transition-colors"
                  style={{ border: "1px solid #E5E7EB" }}
                  onFocus={(e) => (e.target.style.borderColor = "#10B981")}
                  onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleBarcodeScan();
                  }}
                  autoFocus
                />
                <button
                  onClick={handleBarcodeScan}
                  disabled={barcodeScanning || barcodeInput.trim().length < 8}
                  className="px-5 py-3.5 rounded-xl text-sm font-semibold text-white border-none cursor-pointer transition-opacity disabled:opacity-50 shrink-0"
                  style={{ backgroundColor: "#10B981" }}
                >
                  {barcodeScanning ? (
                    <div
                      className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin mx-auto"
                      style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                    />
                  ) : (
                    "스캔"
                  )}
                </button>
              </div>

              {/* Barcode Result */}
              {barcodeResult && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-[#6B7280] mb-1">매칭된 제품</p>
                  <ProductCard
                    product={barcodeResult}
                    onSelect={() => handleSelect(barcodeResult)}
                  />
                </div>
              )}

              {/* Not Found */}
              {barcodeNotFound && (
                <div className="rounded-2xl bg-white p-8 text-center" style={{ border: "1px solid #E5E7EB" }}>
                  <div className="w-12 h-12 rounded-full bg-[#FEF2F2] flex items-center justify-center mx-auto mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth={1.8}>
                      <path d="M3 5v14M7 5v14M10 5v14M14 5v14M17 5v14M21 5v14" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-sm text-[#6B7280]">제품을 찾을 수 없습니다</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">바코드 번호를 다시 확인하거나 검색 탭에서 직접 찾아보세요</p>
                </div>
              )}

              {/* Initial State */}
              {!barcodeResult && !barcodeNotFound && !barcodeScanning && (
                <div className="rounded-2xl bg-[#F9FAFB] p-6 text-center mt-4" style={{ border: "1px dashed #D1D5DB" }}>
                  <div className="w-12 h-12 rounded-full bg-[#ECFDF5] flex items-center justify-center mx-auto mb-3">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={1.8}>
                      <path d="M3 5v14M7 5v14M10 5v14M14 5v14M17 5v14M21 5v14" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#4B5563]">바코드 번호를 입력해주세요</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">제품 포장의 바코드 숫자를 직접 입력합니다</p>
                </div>
              )}
            </>
          )}

          {/* ══════════════ Photo Tab ══════════════ */}
          {activeTab === "photo" && (
            <>
              {/* File Input */}
              <div className="mb-4">
                <label
                  className="flex flex-col items-center justify-center w-full py-8 rounded-2xl cursor-pointer transition-colors"
                  style={{
                    backgroundColor: imagePreview ? "#FFFFFF" : "#F9FAFB",
                    border: imagePreview ? "1px solid #E5E7EB" : "2px dashed #D1D5DB",
                  }}
                >
                  {imagePreview ? (
                    <div className="w-full px-4">
                      <img
                        src={imagePreview}
                        alt="선택한 이미지"
                        className="w-full max-h-48 object-contain rounded-xl"
                      />
                      <p className="text-xs text-[#9CA3AF] text-center mt-2">
                        {imageFile?.name} - 다른 이미지를 선택하려면 클릭하세요
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-[#ECFDF5] flex items-center justify-center mb-3">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={1.8}>
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-[#4B5563]">제품 사진을 선택하세요</p>
                      <p className="text-xs text-[#9CA3AF] mt-1">JPG, PNG (최대 5MB)</p>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Photo Error */}
              {photoError && (
                <div
                  className="rounded-xl px-4 py-3 mb-4 text-sm font-medium"
                  style={{ backgroundColor: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}
                >
                  {photoError}
                </div>
              )}

              {/* AI Analyze Button */}
              {imagePreview && !recognized && (
                <button
                  onClick={handleAIRecognize}
                  disabled={recognizing}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white border-none cursor-pointer transition-opacity disabled:opacity-50 mb-4"
                  style={{ backgroundColor: "#10B981" }}
                >
                  {recognizing ? (
                    <span className="flex items-center justify-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                      />
                      AI가 제품을 분석하고 있습니다...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M12 2a4 4 0 014 4v2a4 4 0 01-8 0V6a4 4 0 014-4z" />
                        <path d="M9 22h6M12 18v4" strokeLinecap="round" />
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                      AI 분석
                    </span>
                  )}
                </button>
              )}

              {/* Recognition Result */}
              {recognized && (recognized.name || recognized.brand) && (
                <div
                  className="rounded-2xl bg-white p-4 mb-4"
                  style={{ border: "1px solid #10B981", backgroundColor: "#ECFDF5" }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2}>
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-sm font-semibold text-[#059669]">인식된 제품</span>
                  </div>
                  <p className="text-sm text-[#1F2937]">
                    {recognized.brand && <span className="font-medium">{recognized.brand} </span>}
                    {recognized.name && <span>{recognized.name}</span>}
                  </p>
                </div>
              )}

              {/* Photo Matches */}
              {photoMatches.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-[#6B7280] mb-1">
                    매칭된 제품 {photoMatches.length}건
                  </p>
                  {photoMatches.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={() => handleSelect(product)}
                    />
                  ))}
                </div>
              )}

              {/* Recognized but no matches */}
              {recognized && (recognized.name || recognized.brand) && photoMatches.length === 0 && (
                <div className="rounded-2xl bg-white p-8 text-center" style={{ border: "1px solid #E5E7EB" }}>
                  <p className="text-sm text-[#6B7280]">매칭되는 제품이 없습니다</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">검색 탭에서 직접 찾아보세요</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
