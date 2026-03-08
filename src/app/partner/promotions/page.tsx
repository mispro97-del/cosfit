"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getPromotions,
  createPromotion,
  updatePromotion,
  togglePromotionActive,
  getPartnerProducts,
  type PromotionData,
  type PromotionFormData,
  type PartnerProductItem,
} from "./actions";

// ── Helpers ──
const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  TIMEDEAL: { label: "타임딜", color: "bg-red-50 text-red-600" },
  BUNDLE: { label: "번들", color: "bg-blue-50 text-blue-600" },
  EVENT: { label: "이벤트", color: "bg-purple-50 text-purple-600" },
};

function getPromotionStatus(p: PromotionData): { label: string; color: string } {
  const now = new Date();
  const start = new Date(p.startDate);
  const end = new Date(p.endDate);

  if (!p.isActive) return { label: "비활성", color: "bg-gray-100 text-gray-600" };
  if (now < start) return { label: "예정", color: "bg-blue-50 text-blue-600" };
  if (now > end) return { label: "종료", color: "bg-red-50 text-red-600" };
  return { label: "진행 중", color: "bg-green-50 text-green-700" };
}

const defaultForm: PromotionFormData = {
  type: "TIMEDEAL",
  title: "",
  startDate: new Date().toISOString().split("T")[0],
  endDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
  config: {},
  products: [],
};

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<PromotionData[]>([]);
  const [partnerProducts, setPartnerProducts] = useState<PartnerProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PromotionFormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [promos, products] = await Promise.all([getPromotions(), getPartnerProducts()]);
      setPromotions(promos);
      setPartnerProducts(products);
    } catch {
      setError("데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreate() {
    setEditingId(null);
    setForm(defaultForm);
    setError("");
    setShowForm(true);
  }

  function openEdit(promo: PromotionData) {
    setEditingId(promo.id);
    setForm({
      type: promo.type as "TIMEDEAL" | "BUNDLE" | "EVENT",
      title: promo.title,
      startDate: promo.startDate,
      endDate: promo.endDate,
      config: (promo.config as Record<string, unknown>) || {},
      products: promo.products.map((p) => ({
        partnerProductId: p.partnerProductId,
        specialPrice: p.specialPrice,
      })),
    });
    setError("");
    setShowForm(true);
  }

  function toggleProduct(productId: string) {
    setForm((prev) => {
      const exists = prev.products.find((p) => p.partnerProductId === productId);
      if (exists) {
        return { ...prev, products: prev.products.filter((p) => p.partnerProductId !== productId) };
      }
      return { ...prev, products: [...prev.products, { partnerProductId: productId, specialPrice: null }] };
    });
  }

  function setProductPrice(productId: string, price: number | null) {
    setForm((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.partnerProductId === productId ? { ...p, specialPrice: price } : p
      ),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const result = editingId
      ? await updatePromotion(editingId, form)
      : await createPromotion(form);

    if (result.success) {
      setShowForm(false);
      setEditingId(null);
      await loadData();
    } else {
      setError(result.error || "오류가 발생했습니다.");
    }
    setSubmitting(false);
  }

  async function handleToggle(promotionId: string) {
    const result = await togglePromotionActive(promotionId);
    if (result.success) await loadData();
    else alert(result.error);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1D21] mb-1">프로모션 관리</h1>
        <p className="text-sm text-[#9CA3AF]">타임딜, 번들, 이벤트 프로모션을 관리합니다.</p>
      </div>

      {/* Quick Links */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          프로모션 생성
        </button>
        <Link
          href="/partner/promotions/coupons"
          className="flex items-center gap-2 rounded-lg bg-[#F0F4F8] px-4 py-2.5 text-sm font-semibold text-[#4B5563] hover:bg-[#E5E9ED] transition-colors no-underline"
        >
          쿠폰 관리
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-[#E5E9ED] bg-white p-6">
          <h2 className="text-lg font-bold text-[#1A1D21] mb-4">
            {editingId ? "프로모션 수정" : "새 프로모션 생성"}
          </h2>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type Selector */}
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-2">프로모션 유형 *</label>
              <div className="flex gap-2">
                {(["TIMEDEAL", "BUNDLE", "EVENT"] as const).map((type) => {
                  const cfg = TYPE_CONFIG[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm({ ...form, type })}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        form.type === type
                          ? "bg-blue-600 text-white"
                          : "bg-[#F0F4F8] text-[#4B5563] hover:bg-[#E5E9ED]"
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1">제목 *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="여름 맞이 타임딜"
                className="w-full rounded-lg border border-[#E5E9ED] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-1">시작일 *</label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full rounded-lg border border-[#E5E9ED] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-1">종료일 *</label>
                <input
                  type="date"
                  required
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full rounded-lg border border-[#E5E9ED] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Product Selection */}
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-2">
                대상 제품 * <span className="text-xs text-[#9CA3AF]">({form.products.length}개 선택)</span>
              </label>
              {partnerProducts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#E5E9ED] p-4 text-center text-sm text-[#9CA3AF]">
                  등록된 제품이 없습니다. 제품을 먼저 등록해 주세요.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto rounded-lg border border-[#E5E9ED] divide-y divide-[#E5E9ED]">
                  {partnerProducts.map((pp) => {
                    const selected = form.products.find((p) => p.partnerProductId === pp.id);
                    return (
                      <div
                        key={pp.id}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[#F8FAFB] transition-colors ${
                          selected ? "bg-blue-50/50" : ""
                        }`}
                        onClick={() => toggleProduct(pp.id)}
                      >
                        <input
                          type="checkbox"
                          checked={!!selected}
                          readOnly
                          className="h-4 w-4 rounded border-[#E5E9ED] text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[#1A1D21] truncate">
                            {pp.productName}
                          </div>
                          <div className="text-xs text-[#9CA3AF]">
                            {pp.brandName}
                            {pp.price ? ` · ${pp.price.toLocaleString()}원` : ""}
                          </div>
                        </div>
                        {selected && form.type === "TIMEDEAL" && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <input
                              type="number"
                              min={0}
                              placeholder="특가"
                              value={selected.specialPrice ?? ""}
                              onChange={(e) =>
                                setProductPrice(
                                  pp.id,
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                              className="w-24 rounded border border-[#E5E9ED] px-2 py-1 text-xs text-right focus:border-blue-500 focus:outline-none"
                            />
                            <span className="text-xs text-[#9CA3AF] ml-1">원</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "처리 중..." : editingId ? "수정" : "생성"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setError("");
                }}
                className="rounded-lg bg-[#F0F4F8] px-6 py-2.5 text-sm font-medium text-[#4B5563] hover:bg-[#E5E9ED] transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Promotion List */}
      {promotions.length === 0 ? (
        <div className="rounded-xl border border-[#E5E9ED] bg-white p-12 text-center">
          <div className="text-[#9CA3AF] mb-2 text-lg">등록된 프로모션이 없습니다</div>
          <div className="text-sm text-[#9CA3AF]">새 프로모션을 생성하여 매출을 높이세요.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {promotions.map((promo) => {
            const typeCfg = TYPE_CONFIG[promo.type] || { label: promo.type, color: "bg-gray-100 text-gray-600" };
            const status = getPromotionStatus(promo);
            return (
              <div
                key={promo.id}
                className="rounded-xl border border-[#E5E9ED] bg-white p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeCfg.color}`}>
                      {typeCfg.label}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(promo)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-[#4B5563] hover:bg-[#F0F4F8] transition-colors"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleToggle(promo.id)}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                        promo.isActive
                          ? "text-orange-600 hover:bg-orange-50"
                          : "text-green-600 hover:bg-green-50"
                      }`}
                    >
                      {promo.isActive ? "비활성" : "활성"}
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-[#1A1D21] mb-2">{promo.title}</h3>

                <div className="flex items-center gap-4 text-xs text-[#9CA3AF] mb-3">
                  <span>{promo.startDate} ~ {promo.endDate}</span>
                  <span>{promo.productCount}개 제품</span>
                </div>

                {/* Products preview */}
                {promo.products.length > 0 && (
                  <div className="border-t border-[#E5E9ED] pt-3 space-y-1">
                    {promo.products.slice(0, 3).map((pp) => (
                      <div key={pp.id} className="flex items-center justify-between text-xs">
                        <span className="text-[#4B5563] truncate">{pp.productName}</span>
                        {pp.specialPrice && (
                          <span className="font-semibold text-red-500 ml-2 shrink-0">
                            {pp.specialPrice.toLocaleString()}원
                          </span>
                        )}
                      </div>
                    ))}
                    {promo.products.length > 3 && (
                      <div className="text-xs text-[#9CA3AF]">
                        +{promo.products.length - 3}개 더
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
