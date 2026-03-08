// ============================================================
// COSFIT - Partner Product Detail Edit Page
// src/app/partner/products/[id]/page.tsx
// ============================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getPartnerProductDetail,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  updateProductDescription,
  addProductImage,
  removeProductImage,
  type PartnerProductFullDetail,
} from "../actions";

type Tab = "basic" | "variants" | "description" | "images";

const TABS: { key: Tab; label: string }[] = [
  { key: "basic", label: "기본정보" },
  { key: "variants", label: "옵션/가격" },
  { key: "description", label: "상세설명" },
  { key: "images", label: "이미지" },
];

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<PartnerProductFullDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("basic");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadProduct = useCallback(async () => {
    const result = await getPartnerProductDetail(productId);
    if (result.success && result.data) {
      setProduct(result.data);
    } else {
      setError(result.error ?? "제품을 불러올 수 없습니다.");
    }
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="p-8 max-w-[1000px]">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48" />
          <div className="h-4 bg-gray-200 rounded w-80" />
          <div className="h-10 bg-gray-200 rounded w-full mt-6" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-8 max-w-[1000px]">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">{error ?? "제품을 찾을 수 없습니다."}</p>
          <Link
            href="/partner/products"
            className="inline-block mt-3 text-sm text-[#10B981] no-underline hover:underline"
          >
            제품 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1000px]">
      {/* Breadcrumb & Header */}
      <div className="mb-6">
        <Link
          href="/partner/products"
          className="text-xs text-[#9CA3AF] no-underline hover:text-[#10B981] transition-colors"
        >
          제품 관리
        </Link>
        <span className="text-xs text-[#D1D5DB] mx-2">/</span>
        <span className="text-xs text-[#6B7280]">상세 편집</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1A1D21] m-0">{product.name}</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            {product.brand} &middot; {product.category}
          </p>
        </div>
        <div className="flex gap-3 text-xs text-[#6B7280]">
          <span>조회 {product.viewCount.toLocaleString()}</span>
          <span>장바구니 {product.cartCount.toLocaleString()}</span>
          <span>구매 {product.purchaseCount.toLocaleString()}</span>
        </div>
      </div>

      {/* Toast Message */}
      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-[#E5E9ED] mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-none bg-transparent cursor-pointer transition-colors ${
              activeTab === tab.key
                ? "text-[#10B981] border-b-2 border-[#10B981]"
                : "text-[#9CA3AF] hover:text-[#4B5563]"
            }`}
            style={
              activeTab === tab.key
                ? { borderBottom: "2px solid #10B981", marginBottom: "-1px" }
                : {}
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "basic" && <BasicInfoTab product={product} />}
      {activeTab === "variants" && (
        <VariantsTab
          product={product}
          saving={saving}
          setSaving={setSaving}
          onReload={loadProduct}
          onMessage={showMessage}
        />
      )}
      {activeTab === "description" && (
        <DescriptionTab
          product={product}
          saving={saving}
          setSaving={setSaving}
          onReload={loadProduct}
          onMessage={showMessage}
        />
      )}
      {activeTab === "images" && (
        <ImagesTab
          product={product}
          saving={saving}
          setSaving={setSaving}
          onReload={loadProduct}
          onMessage={showMessage}
        />
      )}
    </div>
  );
}

// ============================================================
// Tab: Basic Info (읽기 전용 + 프로모션 여부)
// ============================================================

function BasicInfoTab({ product }: { product: PartnerProductFullDetail }) {
  const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);
  const activeVariants = product.variants.filter((v) => v.isActive).length;

  return (
    <div className="bg-white rounded-xl border border-[#E5E9ED] p-6 space-y-5">
      <div className="grid grid-cols-2 gap-5">
        <InfoField label="제품명" value={product.name} />
        <InfoField label="브랜드" value={product.brand} />
        <InfoField label="카테고리" value={product.category} />
        <InfoField
          label="홍보 여부"
          value={product.isPromoted ? "프로모션 ON" : "프로모션 OFF"}
          highlight={product.isPromoted}
        />
        <InfoField label="옵션 수" value={`${activeVariants} / ${product.variants.length} 활성`} />
        <InfoField label="총 재고" value={`${totalStock.toLocaleString()} EA`} />
        <InfoField label="이미지 수" value={`${product.images.length}장`} />
        <InfoField
          label="상세설명"
          value={product.description ? "입력됨" : "미입력"}
          highlight={!!product.description}
        />
      </div>
    </div>
  );
}

function InfoField({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-[#9CA3AF] mb-1">{label}</div>
      <div
        className={`text-sm font-medium ${
          highlight === true
            ? "text-[#10B981]"
            : highlight === false
            ? "text-[#9CA3AF] italic"
            : "text-[#1A1D21]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================
// Tab: Variants (옵션/가격)
// ============================================================

interface TabProps {
  product: PartnerProductFullDetail;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onReload: () => Promise<void>;
  onMessage: (type: "success" | "error", text: string) => void;
}

function VariantsTab({ product, saving, setSaving, onReload, onMessage }: TabProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add form state
  const [newSku, setNewSku] = useState("");
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionType, setNewOptionType] = useState("SIZE");
  const [newPrice, setNewPrice] = useState("");
  const [newOriginalPrice, setNewOriginalPrice] = useState("");
  const [newStock, setNewStock] = useState("0");

  // Edit form state
  const [editOptionName, setEditOptionName] = useState("");
  const [editOptionType, setEditOptionType] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editOriginalPrice, setEditOriginalPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editActive, setEditActive] = useState(true);

  const resetAddForm = () => {
    setNewSku("");
    setNewOptionName("");
    setNewOptionType("SIZE");
    setNewPrice("");
    setNewOriginalPrice("");
    setNewStock("0");
    setShowAdd(false);
  };

  const handleAdd = async () => {
    if (!newSku.trim() || !newOptionName.trim() || !newPrice.trim()) {
      onMessage("error", "SKU, 옵션명, 판매가는 필수입니다.");
      return;
    }
    setSaving(true);
    const result = await createProductVariant(product.id, {
      sku: newSku.trim(),
      optionName: newOptionName.trim(),
      optionType: newOptionType,
      price: parseInt(newPrice),
      originalPrice: newOriginalPrice ? parseInt(newOriginalPrice) : undefined,
      stock: parseInt(newStock) || 0,
    });
    if (result.success) {
      onMessage("success", "옵션이 추가되었습니다.");
      resetAddForm();
      await onReload();
    } else {
      onMessage("error", result.error ?? "옵션 추가에 실패했습니다.");
    }
    setSaving(false);
  };

  const startEdit = (v: PartnerProductFullDetail["variants"][0]) => {
    setEditingId(v.id);
    setEditOptionName(v.optionName);
    setEditOptionType(v.optionType);
    setEditPrice(v.price.toString());
    setEditOriginalPrice(v.originalPrice?.toString() ?? "");
    setEditStock(v.stock.toString());
    setEditActive(v.isActive);
  };

  const handleUpdate = async (variantId: string) => {
    setSaving(true);
    const result = await updateProductVariant(variantId, {
      optionName: editOptionName,
      optionType: editOptionType,
      price: parseInt(editPrice),
      originalPrice: editOriginalPrice ? parseInt(editOriginalPrice) : null,
      stock: parseInt(editStock) || 0,
      isActive: editActive,
    });
    if (result.success) {
      onMessage("success", "옵션이 수정되었습니다.");
      setEditingId(null);
      await onReload();
    } else {
      onMessage("error", result.error ?? "옵션 수정에 실패했습니다.");
    }
    setSaving(false);
  };

  const handleDelete = async (variantId: string) => {
    if (!confirm("이 옵션을 삭제하시겠습니까?")) return;
    setSaving(true);
    const result = await deleteProductVariant(variantId);
    if (result.success) {
      onMessage("success", "옵션이 삭제되었습니다.");
      await onReload();
    } else {
      onMessage("error", result.error ?? "옵션 삭제에 실패했습니다.");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {/* Add Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[#10B981] text-white border-none cursor-pointer hover:bg-[#059669] transition-colors"
          disabled={saving}
        >
          + 옵션 추가
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
          <div className="text-sm font-semibold text-[#1A1D21] mb-2">새 옵션 추가</div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <FormInput label="SKU *" value={newSku} onChange={setNewSku} placeholder="SKU-001" />
            <FormInput
              label="옵션명 *"
              value={newOptionName}
              onChange={setNewOptionName}
              placeholder="50ml"
            />
            <FormSelect
              label="옵션타입"
              value={newOptionType}
              onChange={setNewOptionType}
              options={["SIZE", "COLOR", "TYPE"]}
            />
            <FormInput
              label="판매가 (원) *"
              value={newPrice}
              onChange={setNewPrice}
              type="number"
              placeholder="25000"
            />
            <FormInput
              label="정가 (원)"
              value={newOriginalPrice}
              onChange={setNewOriginalPrice}
              type="number"
              placeholder="30000"
            />
            <FormInput
              label="재고"
              value={newStock}
              onChange={setNewStock}
              type="number"
              placeholder="0"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#10B981] text-white border-none cursor-pointer hover:bg-[#059669] transition-colors disabled:opacity-50"
            >
              {saving ? "저장 중..." : "추가"}
            </button>
            <button
              onClick={resetAddForm}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-[#6B7280] border border-[#E5E9ED] cursor-pointer hover:bg-[#F9FAFB] transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Variants Table */}
      <div className="bg-white rounded-xl border border-[#E5E9ED] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E5E9ED]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#9CA3AF]">SKU</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-[#9CA3AF]">옵션명</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-[#9CA3AF]">타입</th>
              <th className="text-right px-3 py-3 text-xs font-medium text-[#9CA3AF]">판매가</th>
              <th className="text-right px-3 py-3 text-xs font-medium text-[#9CA3AF]">정가</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-[#9CA3AF]">재고</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-[#9CA3AF]">상태</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-[#9CA3AF]">작업</th>
            </tr>
          </thead>
          <tbody>
            {product.variants.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[#9CA3AF]">
                  등록된 옵션이 없습니다. 옵션을 추가해주세요.
                </td>
              </tr>
            ) : (
              product.variants.map((v) => {
                const isEditing = editingId === v.id;
                if (isEditing) {
                  return (
                    <tr key={v.id} className="border-b border-[#F3F4F6] bg-blue-50/30">
                      <td className="px-4 py-3 text-xs text-[#6B7280] font-mono">{v.sku}</td>
                      <td className="px-3 py-3">
                        <input
                          value={editOptionName}
                          onChange={(e) => setEditOptionName(e.target.value)}
                          className="w-full text-sm px-2 py-1 border border-[#E5E9ED] rounded focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={editOptionType}
                          onChange={(e) => setEditOptionType(e.target.value)}
                          className="text-sm px-2 py-1 border border-[#E5E9ED] rounded focus:outline-none focus:border-[#10B981]"
                        >
                          <option value="SIZE">SIZE</option>
                          <option value="COLOR">COLOR</option>
                          <option value="TYPE">TYPE</option>
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-24 text-sm text-right px-2 py-1 border border-[#E5E9ED] rounded focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          value={editOriginalPrice}
                          onChange={(e) => setEditOriginalPrice(e.target.value)}
                          className="w-24 text-sm text-right px-2 py-1 border border-[#E5E9ED] rounded focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          value={editStock}
                          onChange={(e) => setEditStock(e.target.value)}
                          className="w-20 text-sm text-center px-2 py-1 border border-[#E5E9ED] rounded focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => setEditActive(!editActive)}
                          className={`text-xs px-2 py-0.5 rounded-md border-none cursor-pointer ${
                            editActive
                              ? "bg-green-50 text-green-600"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {editActive ? "활성" : "비활성"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleUpdate(v.id)}
                            disabled={saving}
                            className="text-xs px-2 py-1 rounded bg-[#10B981] text-white border-none cursor-pointer hover:bg-[#059669] disabled:opacity-50"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs px-2 py-1 rounded bg-[#F3F4F6] text-[#6B7280] border-none cursor-pointer"
                          >
                            취소
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr
                    key={v.id}
                    className="border-b border-[#F3F4F6] hover:bg-[#FAFBFC] transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-[#6B7280] font-mono">{v.sku}</td>
                    <td className="px-3 py-3 text-[#1A1D21] font-medium">{v.optionName}</td>
                    <td className="text-center px-3 py-3">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[#F3F4F6] text-[#6B7280]">
                        {v.optionType}
                      </span>
                    </td>
                    <td className="text-right px-3 py-3 font-medium text-[#1A1D21]">
                      {v.price.toLocaleString()}원
                    </td>
                    <td className="text-right px-3 py-3 text-[#9CA3AF]">
                      {v.originalPrice ? `${v.originalPrice.toLocaleString()}원` : "-"}
                    </td>
                    <td className="text-center px-3 py-3">
                      <span
                        className={`font-medium ${
                          v.stock === 0
                            ? "text-red-500"
                            : v.stock <= v.lowStockAlert
                            ? "text-orange-500"
                            : "text-[#4B5563]"
                        }`}
                      >
                        {v.stock}
                      </span>
                    </td>
                    <td className="text-center px-3 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                          v.isActive
                            ? "bg-green-50 text-green-600"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {v.isActive ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className="text-right px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => startEdit(v)}
                          className="text-xs px-2 py-1 rounded border border-[#E5E9ED] bg-white text-[#4B5563] cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(v.id)}
                          disabled={saving}
                          className="text-xs px-2 py-1 rounded border border-red-200 bg-white text-red-500 cursor-pointer hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Tab: Description (상세설명)
// ============================================================

function DescriptionTab({ product, saving, setSaving, onReload, onMessage }: TabProps) {
  const [content, setContent] = useState(product.description?.content ?? "");
  const [shortDesc, setShortDesc] = useState(product.description?.shortDesc ?? "");
  const [highlights, setHighlights] = useState<string[]>(
    product.description?.highlights ?? []
  );
  const [newHighlight, setNewHighlight] = useState("");

  const addHighlight = () => {
    if (!newHighlight.trim()) return;
    setHighlights((prev) => [...prev, newHighlight.trim()]);
    setNewHighlight("");
  };

  const removeHighlight = (index: number) => {
    setHighlights((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!content.trim()) {
      onMessage("error", "상세 설명 내용을 입력해주세요.");
      return;
    }
    setSaving(true);
    const result = await updateProductDescription(
      product.id,
      content,
      shortDesc || undefined,
      highlights.length > 0 ? highlights : undefined
    );
    if (result.success) {
      onMessage("success", "상세 설명이 저장되었습니다.");
      await onReload();
    } else {
      onMessage("error", result.error ?? "저장에 실패했습니다.");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      {/* Short Description */}
      <div className="bg-white rounded-xl border border-[#E5E9ED] p-5">
        <label className="block text-sm font-semibold text-[#1A1D21] mb-2">요약 설명</label>
        <input
          value={shortDesc}
          onChange={(e) => setShortDesc(e.target.value)}
          placeholder="한 줄 요약 설명을 입력하세요"
          className="w-full px-3 py-2 text-sm border border-[#E5E9ED] rounded-lg focus:outline-none focus:border-[#10B981] transition-colors"
          maxLength={200}
        />
        <div className="text-xs text-[#9CA3AF] mt-1 text-right">{shortDesc.length}/200</div>
      </div>

      {/* Highlights */}
      <div className="bg-white rounded-xl border border-[#E5E9ED] p-5">
        <label className="block text-sm font-semibold text-[#1A1D21] mb-2">특장점</label>
        <div className="space-y-2 mb-3">
          {highlights.map((h, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-[#F9FAFB] rounded-lg px-3 py-2"
            >
              <span className="text-[#10B981] text-sm font-bold">
                {i + 1}.
              </span>
              <span className="text-sm text-[#1A1D21] flex-1">{h}</span>
              <button
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
            value={newHighlight}
            onChange={(e) => setNewHighlight(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addHighlight()}
            placeholder="특장점을 입력하고 Enter 또는 추가 버튼을 누르세요"
            className="flex-1 px-3 py-2 text-sm border border-[#E5E9ED] rounded-lg focus:outline-none focus:border-[#10B981] transition-colors"
          />
          <button
            onClick={addHighlight}
            className="px-3 py-2 text-sm font-medium text-[#10B981] bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
          >
            추가
          </button>
        </div>
      </div>

      {/* Rich Text Content */}
      <div className="bg-white rounded-xl border border-[#E5E9ED] p-5">
        <label className="block text-sm font-semibold text-[#1A1D21] mb-2">
          상세 설명 (HTML)
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="제품 상세 설명을 HTML 형태로 입력하세요. 예: <h2>주요 성분</h2><p>...</p>"
          rows={12}
          className="w-full px-3 py-2 text-sm border border-[#E5E9ED] rounded-lg focus:outline-none focus:border-[#10B981] transition-colors resize-y font-mono"
        />
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-lg text-sm font-medium bg-[#10B981] text-white border-none cursor-pointer hover:bg-[#059669] transition-colors disabled:opacity-50"
        >
          {saving ? "저장 중..." : "상세 설명 저장"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Tab: Images (이미지)
// ============================================================

function ImagesTab({ product, saving, setSaving, onReload, onMessage }: TabProps) {
  const [newUrl, setNewUrl] = useState("");
  const [isMain, setIsMain] = useState(false);

  const handleAdd = async () => {
    if (!newUrl.trim()) {
      onMessage("error", "이미지 URL을 입력해주세요.");
      return;
    }
    setSaving(true);
    const result = await addProductImage(product.id, newUrl.trim(), isMain);
    if (result.success) {
      onMessage("success", "이미지가 추가되었습니다.");
      setNewUrl("");
      setIsMain(false);
      await onReload();
    } else {
      onMessage("error", result.error ?? "이미지 추가에 실패했습니다.");
    }
    setSaving(false);
  };

  const handleRemove = async (imageId: string) => {
    if (!confirm("이 이미지를 삭제하시겠습니까?")) return;
    setSaving(true);
    const result = await removeProductImage(imageId);
    if (result.success) {
      onMessage("success", "이미지가 삭제되었습니다.");
      await onReload();
    } else {
      onMessage("error", result.error ?? "이미지 삭제에 실패했습니다.");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      {/* Add Image Form */}
      <div className="bg-white rounded-xl border border-[#E5E9ED] p-5">
        <div className="text-sm font-semibold text-[#1A1D21] mb-3">이미지 추가</div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-[#9CA3AF] mb-1">이미지 URL</label>
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 text-sm border border-[#E5E9ED] rounded-lg focus:outline-none focus:border-[#10B981] transition-colors"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#4B5563] cursor-pointer whitespace-nowrap pb-2">
            <input
              type="checkbox"
              checked={isMain}
              onChange={(e) => setIsMain(e.target.checked)}
              className="accent-[#10B981]"
            />
            메인 이미지
          </label>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#10B981] text-white border-none cursor-pointer hover:bg-[#059669] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            추가
          </button>
        </div>
      </div>

      {/* Image Grid */}
      {product.images.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E9ED] p-10 text-center">
          <p className="text-[#9CA3AF] text-sm">등록된 이미지가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {product.images.map((img) => (
            <div
              key={img.id}
              className="bg-white rounded-xl border border-[#E5E9ED] overflow-hidden group"
            >
              <div className="relative aspect-square bg-[#F9FAFB] flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.imageUrl}
                  alt={img.alt ?? product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).parentElement!.innerHTML =
                      '<div class="flex flex-col items-center gap-1 text-[#9CA3AF]"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg><span class="text-xs">로드 실패</span></div>';
                  }}
                />
                {img.isMain && (
                  <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded bg-[#10B981] text-white font-medium">
                    메인
                  </span>
                )}
              </div>
              <div className="p-3 flex items-center justify-between">
                <div className="text-xs text-[#9CA3AF] truncate flex-1 mr-2">
                  순서: {img.sortOrder}
                </div>
                <button
                  onClick={() => handleRemove(img.id)}
                  disabled={saving}
                  className="text-xs px-2 py-1 rounded border border-red-200 bg-white text-red-500 cursor-pointer hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Shared Form Components
// ============================================================

function FormInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-[#9CA3AF] mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-[#E5E9ED] rounded-lg focus:outline-none focus:border-[#10B981] transition-colors"
      />
    </div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-xs text-[#9CA3AF] mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-[#E5E9ED] rounded-lg focus:outline-none focus:border-[#10B981] transition-colors bg-white"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
