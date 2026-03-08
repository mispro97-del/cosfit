// ============================================================
// COSFIT - Partner: 주문/배송 관리 (Enhanced)
// src/app/partner/orders/page.tsx
// ============================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getPartnerOrders,
  getOrderStats,
  updateOrderStatus,
  updateShippingInfo,
  type PartnerOrderView,
  type OrderStats,
  type OrderFilterStatus,
} from "./actions";

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  PENDING_PAYMENT: { label: "결제 대기", bg: "bg-yellow-50", text: "text-yellow-600" },
  PAID: { label: "신규 주문", bg: "bg-blue-50", text: "text-blue-600" },
  PREPARING: { label: "준비중", bg: "bg-purple-50", text: "text-purple-600" },
  SHIPPED: { label: "배송중", bg: "bg-sky-50", text: "text-sky-600" },
  DELIVERED: { label: "배송 완료", bg: "bg-green-50", text: "text-green-600" },
  CANCELLED: { label: "취소", bg: "bg-red-50", text: "text-red-500" },
  RETURN_REQUESTED: { label: "반품 요청", bg: "bg-orange-50", text: "text-orange-600" },
  RETURNED: { label: "반품 완료", bg: "bg-gray-100", text: "text-gray-500" },
};

const FILTER_TABS: { key: OrderFilterStatus; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "PAID", label: "대기" },
  { key: "PREPARING", label: "준비중" },
  { key: "SHIPPED", label: "배송중" },
  { key: "DELIVERED", label: "완료" },
  { key: "CANCELLED", label: "취소" },
];

const CARRIERS = ["CJ대한통운", "한진택배", "롯데택배", "우체국택배", "로젠택배"];

export default function PartnerOrdersPage() {
  const [orders, setOrders] = useState<PartnerOrderView[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderFilterStatus>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Shipping modal state
  const [shippingModal, setShippingModal] = useState<string | null>(null); // orderId
  const [carrier, setCarrier] = useState("CJ대한통운");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [processing, setProcessing] = useState(false);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [ordersRes, statsRes] = await Promise.all([
      getPartnerOrders({
        status: statusFilter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
      getOrderStats(),
    ]);

    if (ordersRes.success && ordersRes.data) setOrders(ordersRes.data);
    if (statsRes.success && statsRes.data) setStats(statsRes.data);
    setLoading(false);
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (
    orderId: string,
    newStatus: "PAID" | "PREPARING" | "SHIPPED" | "DELIVERED"
  ) => {
    setProcessing(true);
    const res = await updateOrderStatus(orderId, newStatus);
    if (res.success) {
      showMessage("success", "주문 상태가 변경되었습니다.");
      await loadData();
    } else {
      showMessage("error", res.error ?? "상태 변경에 실패했습니다.");
    }
    setProcessing(false);
  };

  const handleShipOrder = async () => {
    if (!shippingModal || !trackingNumber) return;
    setProcessing(true);

    // First update shipping info, then change status
    const shippingRes = await updateShippingInfo(shippingModal, carrier, trackingNumber);
    if (!shippingRes.success) {
      showMessage("error", shippingRes.error ?? "배송 정보 저장에 실패했습니다.");
      setProcessing(false);
      return;
    }

    const statusRes = await updateOrderStatus(shippingModal, "SHIPPED");
    if (statusRes.success) {
      showMessage("success", "발송 처리되었습니다.");
      setShippingModal(null);
      setTrackingNumber("");
      await loadData();
    } else {
      showMessage("error", statusRes.error ?? "발송 처리에 실패했습니다.");
    }
    setProcessing(false);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatPrice = (n: number) => n.toLocaleString() + "원";

  if (loading) {
    return (
      <div className="p-8 max-w-[1200px]">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="h-10 bg-gray-200 rounded w-full" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1A1D21] m-0">주문/배송 관리</h1>
        <p className="text-sm text-[#9CA3AF] mt-1">
          주문 확인, 운송장 입력, 배송 상태 관리
        </p>
      </div>

      {/* Toast */}
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

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="처리 대기"
            value={stats.pendingCount}
            unit="건"
            color="text-orange-500"
            highlight={stats.pendingCount > 0}
          />
          <StatCard
            label="오늘 주문"
            value={stats.todayOrderCount}
            unit="건"
            color="text-blue-600"
          />
          <StatCard
            label="이번 달 매출"
            value={stats.monthRevenue}
            unit="원"
            color="text-[#10B981]"
            isPrice
          />
          <StatCard
            label="전체 주문"
            value={stats.totalOrders}
            unit="건"
            color="text-[#1A1D21]"
          />
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Status Tabs */}
        <div className="flex gap-1.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-none cursor-pointer transition-colors ${
                statusFilter === tab.key
                  ? "bg-[#1A1D21] text-white"
                  : "bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#4B5563]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-xs px-2 py-1.5 border border-[#E5E9ED] rounded-lg focus:outline-none focus:border-[#10B981]"
          />
          <span className="text-xs text-[#9CA3AF]">~</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-xs px-2 py-1.5 border border-[#E5E9ED] rounded-lg focus:outline-none focus:border-[#10B981]"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              className="text-xs px-2 py-1.5 rounded-lg border border-[#E5E9ED] bg-white text-[#9CA3AF] cursor-pointer hover:bg-[#F9FAFB]"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* Order List */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E9ED] p-12 text-center">
          <div className="text-4xl mb-3 opacity-30">
            <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-sm text-[#9CA3AF] font-medium">주문이 없습니다.</p>
          <p className="text-xs text-[#C4C9CF] mt-1">
            고객 주문이 들어오면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const st = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PAID;
            return (
              <div
                key={order.orderId}
                className="bg-white rounded-xl border border-[#E5E9ED] overflow-hidden hover:border-[#D1D5DB] transition-colors"
              >
                {/* Order Header */}
                <div className="flex items-center justify-between px-5 py-3 bg-[#F9FAFB] border-b border-[#E5E9ED]">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-md ${st.bg} ${st.text}`}
                    >
                      {st.label}
                    </span>
                    <Link
                      href={`/partner/orders/${order.orderId}`}
                      className="text-sm font-mono text-[#4B5563] hover:text-[#1A1D21] transition-colors"
                    >
                      {order.orderNumber}
                    </Link>
                    <span className="text-xs text-[#9CA3AF]">
                      {formatDate(order.orderedAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#9CA3AF]">{order.buyerName}</span>
                    <span className="text-sm font-bold text-[#1A1D21]">
                      {formatPrice(order.orderTotal)}
                    </span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="px-5 py-3">
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[#1A1D21] font-medium">
                            {item.productName}
                          </span>
                          <span className="text-xs text-[#9CA3AF]">
                            {item.productBrand}
                          </span>
                          {item.fitScore !== null && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium">
                              FIT {item.fitScore}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-[#6B7280]">
                            {formatPrice(item.unitPrice)} x {item.quantity}
                          </span>
                          <span className="text-sm font-semibold text-[#1A1D21] w-24 text-right">
                            {formatPrice(item.totalPrice)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F3F4F6]">
                    <div>
                      {order.carrier && order.trackingNumber && (
                        <span className="text-xs text-[#9CA3AF] font-mono">
                          {order.carrier} {order.trackingNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/partner/orders/${order.orderId}`}
                        className="text-xs px-3 py-1.5 rounded-lg border border-[#E5E9ED] bg-white text-[#6B7280] hover:bg-[#F9FAFB] transition-colors font-medium no-underline"
                      >
                        상세보기
                      </Link>
                      {order.status === "PAID" && (
                        <button
                          onClick={() => handleStatusChange(order.orderId, "PREPARING")}
                          disabled={processing}
                          className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 font-semibold border-none cursor-pointer hover:bg-blue-100 transition-colors disabled:opacity-50"
                        >
                          주문 확인
                        </button>
                      )}
                      {order.status === "PREPARING" && (
                        <button
                          onClick={() => {
                            setShippingModal(order.orderId);
                            setCarrier("CJ대한통운");
                            setTrackingNumber("");
                          }}
                          disabled={processing}
                          className="text-xs px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 font-semibold border-none cursor-pointer hover:bg-purple-100 transition-colors disabled:opacity-50"
                        >
                          발송 처리
                        </button>
                      )}
                      {order.status === "SHIPPED" && (
                        <button
                          onClick={() => handleStatusChange(order.orderId, "DELIVERED")}
                          disabled={processing}
                          className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-600 font-semibold border-none cursor-pointer hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          배송 완료
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shipping Modal */}
      {shippingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl border border-[#E5E9ED] shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-[#E5E9ED]">
              <h3 className="text-base font-bold text-[#1A1D21] m-0">
                발송 처리
              </h3>
              <p className="text-xs text-[#9CA3AF] mt-1">
                택배사와 운송장 번호를 입력해주세요.
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs text-[#9CA3AF] mb-1">택배사</label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E5E9ED] rounded-lg focus:outline-none focus:border-[#10B981]"
                >
                  {CARRIERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#9CA3AF] mb-1">
                  운송장 번호
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="운송장 번호 입력"
                  className="w-full px-3 py-2 text-sm border border-[#E5E9ED] rounded-lg focus:outline-none focus:border-[#10B981]"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#E5E9ED] flex justify-end gap-2">
              <button
                onClick={() => setShippingModal(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-[#6B7280] border border-[#E5E9ED] cursor-pointer hover:bg-[#F9FAFB] transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleShipOrder}
                disabled={processing || !trackingNumber}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#10B981] text-white border-none cursor-pointer hover:bg-[#059669] transition-colors disabled:opacity-50"
              >
                {processing ? "처리 중..." : "발송 확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stat Card Component ──

function StatCard({
  label,
  value,
  unit,
  color,
  highlight,
  isPrice,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  highlight?: boolean;
  isPrice?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border p-5 ${
        highlight ? "border-orange-300 bg-orange-50/30" : "border-[#E5E9ED]"
      }`}
    >
      <div className="text-xs text-[#9CA3AF] mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>
        {isPrice ? value.toLocaleString() : value}
        <span className="text-xs font-normal text-[#9CA3AF] ml-1">{unit}</span>
      </div>
    </div>
  );
}
