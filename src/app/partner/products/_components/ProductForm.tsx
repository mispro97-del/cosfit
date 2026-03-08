// ============================================================
// COSFIT - Shared Product Form (Registration + Edit)
// src/app/partner/products/_components/ProductForm.tsx
// ============================================================

"use client";

import { useState, useCallback, useEffect } from "react";
import {
  searchProductMaster,
  type ProductMasterSearchItem,
} from "../actions";
import RichEditor from "./RichEditor";

// ── Types ──

export interface VariantFormData {
  id?: string;
  sku: string;
  optionName: string;
  optionType: string;
  price: string;
  originalPrice: string;
  stock: string;
  lowStockAlert: string;
  isActive: boolean;
}

export interface ImageFormData {
  id?: string;
  imageUrl: string;
  isMain: boolean;
}

export interface ProductFormData {
  productId: string;
  productName: string;
  productBrand: string;
  category: string;
  variants: VariantFormData[];
  images: ImageFormData[];
  descriptionContent: string;
  shortDesc: string;
  highlights: string[];
}

interface ProductFormProps {
  initialData?: ProductFormData;
  isEdit?: boolean;
  saving: boolean;
  onSubmit: (data: ProductFormData) => void;
}

const CATEGORIES = [
  "CLEANSER", "TONER", "SERUM", "EMULSION", "CREAM",
  "SUNSCREEN", "MASK", "EYE_CARE", "LIP_CARE", "BODY_CARE",
  "MAKEUP_BASE", "OTHER",
];

const CATEGORY_LABELS: Record<string, string> = {
  CLEANSER: "클렌저", TONER: "토너", SERUM: "세럼", EMULSION: "에멀전",
  CREAM: "크림", SUNSCREEN: "선크림", MASK: "마스크", EYE_CARE: "아이케어",
  LIP_CARE: "립케어", BODY_CARE: "바디케어", MAKEUP_BASE: "메이크업베이스",
  OTHER: "기타",
};

const OPTION_TYPES = ["SIZE", "COLOR", "TYPE"];

const emptyVariant = (): VariantFormData => ({
  sku: "",
  optionName: "",
  optionType: "SIZE",
  price: "",
  originalPrice: "",
  stock: "0",
  lowStockAlert: "5",
  isActive: true,
});

export default function ProductForm({
  initialData,
  isEdit = false,
  saving,
  onSubmit,
}: ProductFormProps) {
  // ── State ──
  const [productId, setProductId] = useState(initialData?.productId ?? "");
  const [productName, setProductName] = useState(initialData?.productName ?? "");
  const [productBrand, setProductBrand] = useState(initialData?.productBrand ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "CREAM");
  const [variants, setVariants] = useState<VariantFormData[]>(
    initialData?.variants ?? [emptyVariant()]
  );
  const [images, setImages] = useState<ImageFormData[]>(initialData?.images ?? []);
  const [descriptionContent, setDescriptionContent] = useState(
    initialData?.descriptionContent ?? ""
  );
  const [shortDesc, setShortDesc] = useState(initialData?.shortDesc ?? "");
  const [highlights, setHighlights] = useState<string[]>(
    initialData?.highlights ?? []
  );
  const [newHighlight, setNewHighlight] = useState("");

  // Product search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductMasterSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Image add
  const [newImageUrl, setNewImageUrl] = useState("");

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Active section (accordion style)
  const [activeSection, setActiveSection] = useState<string>("basic");

  // ── Product Master Search ──
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const result = await searchProductMaster(searchQuery);
    if (result.success && result.data) {
      setSearchResults(result.data);
    }
    setIsSearching(false);
    setShowSearch(true);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch();
      } else {
        setSearchResults([]);
        setShowSearch(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const selectProduct = (item: ProductMasterSearchItem) => {
    setProductId(item.id);
    setProductName(item.name);
    setProductBrand(item.brand);
    setCategory(item.category);
    setSearchQuery("");
    setShowSearch(false);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.productId;
      return next;
    });
  };

  // ── Variant Handlers ──
  const addVariant = () => {
    setVariants((prev) => [...prev, emptyVariant()]);
  };

  const updateVariant = (index: number, field: keyof VariantFormData, value: string | boolean) => {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Image Handlers ──
  const addImage = () => {
    if (!newImageUrl.trim()) return;
    if (images.length >= 10) {
      setErrors((prev) => ({ ...prev, images: "최대 10장까지 등록 가능합니다." }));
      return;
    }
    const isFirst = images.length === 0;
    setImages((prev) => [
      ...prev,
      { imageUrl: newImageUrl.trim(), isMain: isFirst },
    ]);
    setNewImageUrl("");
    setErrors((prev) => {
      const next = { ...prev };
      delete next.images;
      return next;
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // If we removed the main image, set first as main
      if (next.length > 0 && !next.some((img) => img.isMain)) {
        next[0].isMain = true;
      }
      return next;
    });
  };

  const setMainImage = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({ ...img, isMain: i === index }))
    );
  };

  const moveImage = (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      [next[index], next[newIdx]] = [next[newIdx], next[index]];
      return next;
    });
  };

  // ── Highlight Handlers ──
  const addHighlight = () => {
    if (!newHighlight.trim()) return;
    setHighlights((prev) => [...prev, newHighlight.trim()]);
    setNewHighlight("");
  };

  const removeHighlight = (index: number) => {
    setHighlights((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Validation & Submit ──
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!productId) errs.productId = "제품을 선택해주세요.";

    // Variants validation
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.sku.trim()) errs[`variant_${i}_sku`] = `옵션 ${i + 1}: SKU는 필수입니다.`;
      if (!v.optionName.trim()) errs[`variant_${i}_name`] = `옵션 ${i + 1}: 옵션명은 필수입니다.`;
      if (!v.price || parseInt(v.price) <= 0) errs[`variant_${i}_price`] = `옵션 ${i + 1}: 판매가를 입력해주세요.`;
    }

    // Check for duplicate SKUs
    const skus = variants.map((v) => v.sku.trim()).filter(Boolean);
    const uniqueSkus = new Set(skus);
    if (skus.length !== uniqueSkus.size) {
      errs.variant_sku_dup = "중복된 SKU가 있습니다.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      productId,
      productName,
      productBrand,
      category,
      variants,
      images,
      descriptionContent,
      shortDesc,
      highlights,
    });
  };

  // ── Section Toggle ──
  const SectionHeader = ({
    id,
    title,
    subtitle,
    badge,
  }: {
    id: string;
    title: string;
    subtitle: string;
    badge?: string;
  }) => (
    <button
      type="button"
      onClick={() => setActiveSection(activeSection === id ? "" : id)}
      className="w-full flex items-center justify-between px-6 py-4 bg-white border-none cursor-pointer text-left hover:bg-[#FAFBFC] transition-colors"
    >
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-[#1A1D21] m-0">{title}</h2>
          {badge && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981] font-semibold">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-[#9CA3AF] mt-0.5 m-0">{subtitle}</p>
      </div>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#9CA3AF"
        strokeWidth={2}
        className={`transition-transform ${activeSection === id ? "rotate-180" : ""}`}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Error Summary */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-sm font-semibold text-red-700 mb-1">입력 오류가 있습니다</div>
          <ul className="text-xs text-red-600 space-y-0.5 m-0 pl-4">
            {Object.values(errors).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Section 1: Basic Info ── */}
      <div className="bg-white rounded-xl border border-[#E5E9ED] overflow-hidden">
        <SectionHeader
          id="basic"
          title="기본 정보"
          subtitle="제품명, 카테고리, 연동 제품 선택"
          badge="필수"
        />
        {activeSection === "basic" && (
          <div className="px-6 pb-6 space-y-4 border-t border-[#E5E9ED]">
            {/* Product Search */}
            {!isEdit && (
              <div className="pt-4">
                <label className="block text-sm font-semibold text-[#1A1D21] mb-2">
                  제품 마스터 연동 <span className="text-red-400">*</span>
                </label>
                {productId ? (
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[#1A1D21]">
                        {productName}
                      </div>
                      <div className="text-xs text-[#9CA3AF]">
                        {productBrand} / {CATEGORY_LABELS[category] ?? category}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProductId("");
                        setProductName("");
                        setProductBrand("");
                      }}
                      className="text-xs px-3 py-1 rounded border border-[#E5E9ED] bg-white text-[#6B7280] cursor-pointer hover:bg-[#F3F4F6]"
                    >
                      변경
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="제품명 또는 브랜드명으로 검색하세요"
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:border-[#10B981] transition-colors ${
                        errors.productId ? "border-red-300" : "border-[#E5E9ED]"
                      }`}
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {/* Search Results Dropdown */}
                    {showSearch && searchResults.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-[#E5E9ED] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {searchResults.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => selectProduct(item)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left border-none bg-white cursor-pointer hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6] last:border-b-0"
                          >
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-8 h-8 rounded object-cover bg-[#F3F4F6]"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-[#F3F4F6] flex items-center justify-center text-[#9CA3AF] text-xs">
                                N/A
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-[#1A1D21] truncate">
                                {item.name}
                              </div>
                              <div className="text-xs text-[#9CA3AF]">
                                {item.brand} / {CATEGORY_LABELS[item.category] ?? item.category}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {showSearch && searchResults.length === 0 && !isSearching && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-[#E5E9ED] rounded-lg shadow-lg p-4 text-center text-sm text-[#9CA3AF]">
                        검색 결과가 없습니다
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* If editing, show product info read-only */}
            {isEdit && (
              <div className="pt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#9CA3AF] mb-1">제품명</label>
                  <div className="text-sm font-medium text-[#1A1D21] bg-[#F9FAFB] px-3 py-2.5 rounded-lg">
                    {productName}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#9CA3AF] mb-1">브랜드</label>
                  <div className="text-sm font-medium text-[#1A1D21] bg-[#F9FAFB] px-3 py-2.5 rounded-lg">
                    {productBrand}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#9CA3AF] mb-1">카테고리</label>
                  <div className="text-sm font-medium text-[#1A1D21] bg-[#F9FAFB] px-3 py-2.5 rounded-lg">
                    {CATEGORY_LABELS[category] ?? category}
                  </div>
                </div>
              </div>
            )}

            {/* Category selector for new products */}
            {!isEdit && productId && (
              <div>
                <label className="block text-xs text-[#9CA3AF] mb-1">카테고리</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-[#E5E9ED] rounded-lg focus:outline-none focus:border-[#10B981] bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Section 2: Variants ── */}
      <div className="bg-white rounded-xl border border-[#E5E9ED] overflow-hidden">
        <SectionHeader
          id="variants"
          title="옵션/가격"
          subtitle="SKU, 사이즈/컬러 옵션, 판매가, 재고 관리"
          badge={`${variants.length}개`}
        />
        {activeSection === "variants" && (
          <div className="px-6 pb-6 border-t border-[#E5E9ED]">
            {/* Variants Table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E9ED]">
                    <th className="text-left px-2 py-2 text-xs font-medium text-[#9CA3AF]">SKU *</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-[#9CA3AF]">옵션명 *</th>
                    <th className="text-center px-2 py-2 text-xs font-medium text-[#9CA3AF]">타입</th>
                    <th className="text-right px-2 py-2 text-xs font-medium text-[#9CA3AF]">판매가 *</th>
                    <th className="text-right px-2 py-2 text-xs font-medium text-[#9CA3AF]">정가</th>
                    <th className="text-center px-2 py-2 text-xs font-medium text-[#9CA3AF]">재고</th>
                    <th className="text-center px-2 py-2 text-xs font-medium text-[#9CA3AF]">알림기준</th>
                    {isEdit && (
                      <th className="text-center px-2 py-2 text-xs font-medium text-[#9CA3AF]">활성</th>
                    )}
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v, i) => (
                    <tr key={i} className="border-b border-[#F3F4F6]">
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={v.sku}
                          onChange={(e) => updateVariant(i, "sku", e.target.value)}
                          placeholder="SKU-001"
                          disabled={isEdit && !!v.id}
                          className={`w-28 px-2 py-1.5 text-xs font-mono border rounded focus:outline-none focus:border-[#10B981] ${
                            errors[`variant_${i}_sku`] ? "border-red-300" : "border-[#E5E9ED]"
                          } ${isEdit && v.id ? "bg-[#F9FAFB] text-[#9CA3AF]" : ""}`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={v.optionName}
                          onChange={(e) => updateVariant(i, "optionName", e.target.value)}
                          placeholder="50ml"
                          className={`w-24 px-2 py-1.5 text-xs border rounded focus:outline-none focus:border-[#10B981] ${
                            errors[`variant_${i}_name`] ? "border-red-300" : "border-[#E5E9ED]"
                          }`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={v.optionType}
                          onChange={(e) => updateVariant(i, "optionType", e.target.value)}
                          className="w-20 px-1 py-1.5 text-xs border border-[#E5E9ED] rounded focus:outline-none focus:border-[#10B981] bg-white"
                        >
                          {OPTION_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={v.price}
                          onChange={(e) => updateVariant(i, "price", e.target.value)}
                          placeholder="25000"
                          className={`w-24 px-2 py-1.5 text-xs text-right border rounded focus:outline-none focus:border-[#10B981] ${
                            errors[`variant_${i}_price`] ? "border-red-300" : "border-[#E5E9ED]"
                          }`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={v.originalPrice}
                          onChange={(e) => updateVariant(i, "originalPrice", e.target.value)}
                          placeholder="30000"
                          className="w-24 px-2 py-1.5 text-xs text-right border border-[#E5E9ED] rounded focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={v.stock}
                          onChange={(e) => updateVariant(i, "stock", e.target.value)}
                          className="w-16 px-2 py-1.5 text-xs text-center border border-[#E5E9ED] rounded focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={v.lowStockAlert}
                          onChange={(e) => updateVariant(i, "lowStockAlert", e.target.value)}
                          className="w-14 px-2 py-1.5 text-xs text-center border border-[#E5E9ED] rounded focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      {isEdit && (
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => updateVariant(i, "isActive", !v.isActive)}
                            className={`text-[10px] px-2 py-0.5 rounded-md border-none cursor-pointer ${
                              v.isActive
                                ? "bg-green-50 text-green-600"
                                : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            {v.isActive ? "ON" : "OFF"}
                          </button>
                        </td>
                      )}
                      <td className="px-2 py-2">
                        {variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVariant(i)}
                            className="text-red-400 hover:text-red-600 bg-transparent border-none cursor-pointer"
                            title="삭제"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {errors.variant_sku_dup && (
              <p className="text-xs text-red-500 mt-1">{errors.variant_sku_dup}</p>
            )}
            <button
              type="button"
              onClick={addVariant}
              className="mt-3 px-4 py-2 text-xs font-medium text-[#10B981] bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
            >
              + 옵션 추가
            </button>
          </div>
        )}
      </div>

      {/* ── Section 3: Description (Rich Editor) ── */}
      <div className="bg-white rounded-xl border border-[#E5E9ED] overflow-hidden">
        <SectionHeader
          id="description"
          title="상세 설명"
          subtitle="리치 에디터로 상세 설명을 작성하세요 (HTML 붙여넣기 지원)"
        />
        {activeSection === "description" && (
          <div className="px-6 pb-6 space-y-4 border-t border-[#E5E9ED]">
            {/* Short Description */}
            <div className="pt-4">
              <label className="block text-sm font-semibold text-[#1A1D21] mb-2">
                요약 설명
              </label>
              <input
                type="text"
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
                placeholder="한 줄 요약 설명을 입력하세요"
                maxLength={200}
                className="w-full px-3 py-2.5 text-sm border border-[#E5E9ED] rounded-lg focus:outline-none focus:border-[#10B981]"
              />
              <div className="text-xs text-[#9CA3AF] mt-1 text-right">
                {shortDesc.length}/200
              </div>
            </div>

            {/* Highlights */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1D21] mb-2">
                특장점
              </label>
              <div className="space-y-2 mb-3">
                {highlights.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-[#F9FAFB] rounded-lg px-3 py-2"
                  >
                    <span className="text-[#10B981] text-sm font-bold">{i + 1}.</span>
                    <span className="text-sm text-[#1A1D21] flex-1">{h}</span>
                    <button
                      type="button"
                      onClick={() => removeHighlight(i)}
                      className="text-xs text-red-400 hover:text-red-600 cursor-pointer bg-transparent border-none"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newHighlight}
                  onChange={(e) => setNewHighlight(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHighlight())}
                  placeholder="특장점을 입력하고 Enter"
                  className="flex-1 px-3 py-2 text-sm border border-[#E5E9ED] rounded-lg focus:outline-none focus:border-[#10B981]"
                />
                <button
                  type="button"
                  onClick={addHighlight}
                  className="px-3 py-2 text-sm font-medium text-[#10B981] bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100"
                >
                  추가
                </button>
              </div>
            </div>

            {/* Rich Editor */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1D21] mb-2">
                상세 설명 (리치 에디터)
              </label>
              <p className="text-xs text-[#9CA3AF] mb-2">
                다른 쇼핑몰 페이지에서 복사한 HTML 콘텐츠를 붙여넣기 할 수 있습니다.
                HTML 버튼으로 소스 코드를 직접 편집할 수도 있습니다.
              </p>
              <RichEditor
                value={descriptionContent}
                onChange={setDescriptionContent}
                placeholder="제품 상세 설명을 입력하세요. 다른 쇼핑몰에서 복사한 내용을 그대로 붙여넣기 할 수 있습니다."
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Section 4: Images ── */}
      <div className="bg-white rounded-xl border border-[#E5E9ED] overflow-hidden">
        <SectionHeader
          id="images"
          title="이미지 관리"
          subtitle="제품 이미지 URL 등록 (최대 10장)"
          badge={images.length > 0 ? `${images.length}장` : undefined}
        />
        {activeSection === "images" && (
          <div className="px-6 pb-6 border-t border-[#E5E9ED]">
            {/* Add image */}
            <div className="flex gap-2 items-end pt-4">
              <div className="flex-1">
                <label className="block text-xs text-[#9CA3AF] mb-1">이미지 URL</label>
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addImage())}
                  placeholder="https://example.com/product-image.jpg"
                  className="w-full px-3 py-2 text-sm border border-[#E5E9ED] rounded-lg focus:outline-none focus:border-[#10B981]"
                />
              </div>
              <button
                type="button"
                onClick={addImage}
                className="px-4 py-2 text-sm font-medium bg-[#10B981] text-white rounded-lg border-none cursor-pointer hover:bg-[#059669] whitespace-nowrap"
              >
                추가
              </button>
            </div>
            {errors.images && (
              <p className="text-xs text-red-500 mt-1">{errors.images}</p>
            )}

            {/* Image List */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                {images.map((img, i) => (
                  <div
                    key={i}
                    className="bg-[#F9FAFB] rounded-xl border border-[#E5E9ED] overflow-hidden"
                  >
                    <div className="relative aspect-square flex items-center justify-center bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.imageUrl}
                        alt={`Product image ${i + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      {img.isMain && (
                        <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded bg-[#10B981] text-white font-semibold">
                          메인
                        </span>
                      )}
                    </div>
                    <div className="px-3 py-2 flex items-center justify-between gap-1">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveImage(i, "up")}
                          disabled={i === 0}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#E5E9ED] text-[#6B7280] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          UP
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(i, "down")}
                          disabled={i === images.length - 1}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#E5E9ED] text-[#6B7280] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          DN
                        </button>
                        {!img.isMain && (
                          <button
                            type="button"
                            onClick={() => setMainImage(i)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 border border-green-200 text-green-600 cursor-pointer"
                          >
                            메인설정
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="text-[10px] px-1.5 py-0.5 rounded border border-red-200 text-red-500 bg-white cursor-pointer hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {images.length === 0 && (
              <div className="mt-4 text-center py-8 text-sm text-[#9CA3AF]">
                등록된 이미지가 없습니다. URL을 입력하고 추가 버튼을 누르세요.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Submit Button ── */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="px-8 py-3 rounded-xl text-sm font-bold bg-[#10B981] text-white border-none cursor-pointer hover:bg-[#059669] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {saving
            ? "저장 중..."
            : isEdit
            ? "제품 수정 완료"
            : "제품 등록"}
        </button>
      </div>
    </div>
  );
}
