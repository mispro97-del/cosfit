"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  toggleCouponActive,
  deleteCoupon,
  type CouponData,
  type CouponFormData,
} from "../actions";

// ── Status helpers ──
function getCouponStatus(coupon: CouponData): { label: string; color: string } {
  const now = new Date();
  const start = new Date(coupon.startDate);
  const end = new Date(coupon.endDate);

  if (!coupon.isActive) return { label: "비활성", color: "bg-gray-100 text-gray-600" };
  if (now < start) return { label: "예정", color: "bg-blue-50 text-blue-600" };
  if (now > end) return { label: "만료", color: "bg-red-50 text-red-600" };
  return { label: "활성", color: "bg-green-50 text-green-700" };
}

function formatDiscount(coupon: CouponData): string {
  if (coupon.discountType === "PERCENTAGE") return `${coupon.discountValue}%`;
  return `${coupon.discountValue.toLocaleString()}원`;
}

// ── Default form state ──
const defaultForm: CouponFormData = {
  code: "",
  name: "",
  discountType: "FIXED",
  discountValue: 0,
  minOrderAmount: null,
  maxDiscount: null,
  usageLimit: null,
  startDate: new Date().toISOString().split("T")[0],
  endDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<CouponData[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, totalUsed: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponFormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const result = await getCoupons();
      setCoupons(result.coupons);
      setStats(result.stats);
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

  function openEdit(coupon: CouponData) {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      name: coupon.name,
      discountType: coupon.discountType as "FIXED" | "PERCENTAGE",
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount,
      maxDiscount: coupon.maxDiscount,
      usageLimit: coupon.usageLimit,
      startDate: coupon.startDate,
      endDate: coupon.endDate,
    });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const result = editingId
      ? await updateCoupon(editingId, form)
      : await createCoupon(form);

    if (result.success) {
      setShowForm(false);
      setEditingId(null);
      await loadData();
    } else {
      setError(result.error || "오류가 발생했습니다.");
    }
    setSubmitting(false);
  }

  async function handleToggle(couponId: string) {
    const result = await toggleCouponActive(couponId);
    if (result.success) await loadData();
    else alert(result.error);
  }

  async function handleDelete(couponId: string) {
    if (!confirm("이 쿠폰을 삭제하시겠습니까?")) return;
    const result = await deleteCoupon(couponId);
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
        <div className="flex items-center gap-2 text-sm text-[#9CA3AF] mb-1">
          <Link href="/partner/promotions" className="hover:text-[#4B5563] transition-colors">
            프로모션
          </Link>
          <span>/</span>
          <span className="text-[#4B5563]">쿠폰 관리</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#1A1D21]">쿠폰 관리</h1>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            쿠폰 생성
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "전체 쿠폰", value: stats.total, unit: "개" },
          { label: "활성 쿠폰", value: stats.active, unit: "개" },
          { label: "총 사용 횟수", value: stats.totalUsed, unit: "회" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#E5E9ED] bg-white p-4">
            <div className="text-xs text-[#9CA3AF] mb-1">{s.label}</div>
            <div className="text-2xl font-bold text-[#1A1D21]">
              {s.value.toLocaleString()}
              <span className="text-sm font-normal text-[#9CA3AF] ml-1">{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-[#E5E9ED] bg-white p-6">
          <h2 className="text-lg font-bold text-[#1A1D21] mb-4">
            {editingId ? "쿠폰 수정" : "새 쿠폰 생성"}
          </h2>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-1">
                  쿠폰 코드 <span className="text-xs text-[#9CA3AF]">(비우면 자동 생성)</span>
                </label>
                <input
                  type="text"
                  value={form.code || ""}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="CF-XXXXXXXX"
                  className="w-full rounded-lg border border-[#E5E9ED] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-1">쿠폰 이름 *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="여름 특가 할인"
                  className="w-full rounded-lg border border-[#E5E9ED] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Discount Type */}
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-2">할인 유형 *</label>
              <div className="flex gap-2">
                {(["FIXED", "PERCENTAGE"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm({ ...form, discountType: type, maxDiscount: null })}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      form.discountType === type
                        ? "bg-blue-600 text-white"
                        : "bg-[#F0F4F8] text-[#4B5563] hover:bg-[#E5E9ED]"
                    }`}
                  >
                    {type === "FIXED" ? "정액 (원)" : "정률 (%)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Discount Value */}
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-1">
                  할인값 * {form.discountType === "FIXED" ? "(원)" : "(%)"}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={form.discountType === "PERCENTAGE" ? 100 : undefined}
                  value={form.discountValue || ""}
                  onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                  className="w-full rounded-lg border border-[#E5E9ED] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {/* Min Order */}
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-1">최소 주문금액 (원)</label>
                <input
                  type="number"
                  min={0}
                  value={form.minOrderAmount ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, minOrderAmount: e.target.value ? Number(e.target.value) : null })
                  }
                  placeholder="0"
                  className="w-full rounded-lg border border-[#E5E9ED] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {/* Max Discount (for %) */}
              {form.discountType === "PERCENTAGE" && (
                <div>
                  <label className="block text-sm font-medium text-[#4B5563] mb-1">최대 할인액 (원)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.maxDiscount ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, maxDiscount: e.target.value ? Number(e.target.value) : null })
                    }
                    placeholder="10000"
                    className="w-full rounded-lg border border-[#E5E9ED] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Usage Limit */}
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-1">사용 제한 횟수</label>
                <input
                  type="number"
                  min={1}
                  value={form.usageLimit ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, usageLimit: e.target.value ? Number(e.target.value) : null })
                  }
                  placeholder="무제한"
                  className="w-full rounded-lg border border-[#E5E9ED] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {/* Start Date */}
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
              {/* End Date */}
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

      {/* Coupon List */}
      {coupons.length === 0 ? (
        <div className="rounded-xl border border-[#E5E9ED] bg-white p-12 text-center">
          <div className="text-[#9CA3AF] mb-2 text-lg">등록된 쿠폰이 없습니다</div>
          <div className="text-sm text-[#9CA3AF]">새 쿠폰을 생성하여 고객에게 할인 혜택을 제공하세요.</div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#E5E9ED] bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E9ED] bg-[#F8FAFB]">
                  <th className="px-4 py-3 text-left font-semibold text-[#4B5563]">코드</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#4B5563]">이름</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#4B5563]">할인</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#4B5563]">최소 주문</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#4B5563]">사용</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#4B5563]">기간</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#4B5563]">상태</th>
                  <th className="px-4 py-3 text-right font-semibold text-[#4B5563]">관리</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => {
                  const status = getCouponStatus(coupon);
                  return (
                    <tr key={coupon.id} className="border-b border-[#E5E9ED] last:border-0 hover:bg-[#F8FAFB] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[#1A1D21]">
                        {coupon.code}
                      </td>
                      <td className="px-4 py-3 text-[#1A1D21]">{coupon.name}</td>
                      <td className="px-4 py-3 font-semibold text-blue-600">
                        {formatDiscount(coupon)}
                      </td>
                      <td className="px-4 py-3 text-[#4B5563]">
                        {coupon.minOrderAmount
                          ? `${coupon.minOrderAmount.toLocaleString()}원`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-[#4B5563]">
                        {coupon.usedCount}
                        {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#9CA3AF]">
                        {coupon.startDate} ~ {coupon.endDate}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(coupon)}
                            className="rounded-md px-2 py-1 text-xs font-medium text-[#4B5563] hover:bg-[#F0F4F8] transition-colors"
                            title="수정"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleToggle(coupon.id)}
                            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                              coupon.isActive
                                ? "text-orange-600 hover:bg-orange-50"
                                : "text-green-600 hover:bg-green-50"
                            }`}
                          >
                            {coupon.isActive ? "비활성" : "활성"}
                          </button>
                          {coupon.usedCount === 0 && (
                            <button
                              onClick={() => handleDelete(coupon.id)}
                              className="rounded-md px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
