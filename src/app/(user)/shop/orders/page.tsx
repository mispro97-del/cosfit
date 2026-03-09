// ============================================================
// COSFIT - User: 주문 내역 / 배송 조회 (DB 연동)
// app/(user)/shop/orders/page.tsx
// ============================================================

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchOrders,
  fetchOrderDetail,
  type OrderSummary,
  type OrderDetail,
} from "../actions";

const STATUS: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  PENDING_PAYMENT: { label: "결제 대기", bg: "#F3F4F6", color: "#8B7E76", icon: "\u23F3" },
  PAID: { label: "결제 완료", bg: "#EFF6FF", color: "#3B82F6", icon: "\uD83D\uDCB3" },
  PREPARING: { label: "상품 준비중", bg: "#FFFBEB", color: "#D97706", icon: "\uD83D\uDCE6" },
  SHIPPED: { label: "배송중", bg: "#EFF6FF", color: "#3B82F6", icon: "\uD83D\uDE9A" },
  DELIVERED: { label: "배송 완료", bg: "#F0FDF4", color: "#22C55E", icon: "\u2705" },
  CANCELLED: { label: "취소됨", bg: "#FEF2F2", color: "#EF4444", icon: "\u274C" },
};

const TRACK_STEPS = ["결제 완료", "상품 준비", "배송 출발", "배송 완료"];
const STEP_MAP: Record<string, number> = { PAID: 0, PREPARING: 1, SHIPPED: 2, DELIVERED: 3 };

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const result = await fetchOrders();
      if (result.success && result.data) {
        setOrders(result.data);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleToggle = async (orderId: string) => {
    if (selectedId === orderId) {
      setSelectedId(null);
      setSelectedDetail(null);
      return;
    }
    setSelectedId(orderId);
    setDetailLoading(true);
    const result = await fetchOrderDetail(orderId);
    if (result.success && result.data) {
      setSelectedDetail(result.data);
    }
    setDetailLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-5">
        <span className="text-5xl mb-4">{"\uD83D\uDCE6"}</span>
        <p className="text-base font-semibold text-[#2D2420] mb-2">주문 내역이 없습니다</p>
        <p className="text-sm text-[#8B7E76] mb-6">제품을 분석하고 구매해보세요!</p>
        <Link href="/compare" className="px-6 py-3 rounded-2xl bg-[#10B981] text-white font-semibold no-underline text-sm">
          제품 비교하러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <h1 className="text-lg font-bold text-[#2D2420] m-0">{"\uD83D\uDCE6"} 주문 내역</h1>
      <p className="text-[13px] text-[#8B7E76] mt-1 mb-4">총 {orders.length}건</p>

      <div className="flex flex-col gap-2.5">
        {orders.map((ord) => {
          const st = STATUS[ord.status] ?? STATUS.PREPARING;
          const isOpen = selectedId === ord.id;
          const step = STEP_MAP[ord.status] ?? 0;
          const detail = isOpen ? selectedDetail : null;

          return (
            <div
              key={ord.id}
              className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden transition-shadow"
              style={{ boxShadow: isOpen ? "0 4px 24px rgba(45,36,32,0.08)" : "none" }}
            >
              {/* Header row */}
              <div
                className="flex items-center gap-2.5 p-3.5 cursor-pointer"
                onClick={() => handleToggle(ord.id)}
              >
                <span className="text-xl">{st.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#2D2420] truncate">
                    {ord.firstProductName}
                    {ord.itemCount > 1 && ` 외 ${ord.itemCount - 1}건`}
                  </div>
                  <div className="text-xs text-[#8B7E76] mt-0.5">
                    {new Date(ord.orderedAt).toLocaleDateString("ko-KR")} / {ord.finalAmount.toLocaleString()}원
                  </div>
                </div>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                  style={{ background: st.bg, color: st.color }}
                >
                  {st.label}
                </span>
                <span className="text-xs text-[#B5AAA2]">{isOpen ? "\u25B2" : "\u25BC"}</span>
              </div>

              {/* Expanded */}
              {isOpen && (
                <div className="px-3.5 pb-3.5 border-t border-[#E5E7EB]">
                  {detailLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-5 h-5 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : detail ? (
                    <>
                      {/* Tracking progress */}
                      {ord.status !== "CANCELLED" && ord.status !== "PENDING_PAYMENT" && (
                        <>
                          <div className="flex items-center py-3 gap-0">
                            {TRACK_STEPS.map((s, i) => (
                              <div key={i} className="flex items-center" style={{ flex: i < TRACK_STEPS.length - 1 ? 1 : 0 }}>
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                                  style={{
                                    background: i <= step ? "#10B981" : "#E5E7EB",
                                    color: i <= step ? "#fff" : "#B5AAA2",
                                  }}
                                >
                                  {i <= step ? "\u2713" : i + 1}
                                </div>
                                {i < TRACK_STEPS.length - 1 && (
                                  <div
                                    className="flex-1 h-0.5 mx-0.5 rounded"
                                    style={{ background: i < step ? "#10B981" : "#E5E7EB" }}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between mb-3">
                            {TRACK_STEPS.map((s, i) => (
                              <span
                                key={i}
                                className="text-[10px] text-center flex-1"
                                style={{ color: i <= step ? "#10B981" : "#B5AAA2" }}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Tracking number */}
                      {detail.shipping?.carrier && (
                        <div className="bg-[#EFF6FF] rounded-xl p-2.5 flex justify-between items-center mb-3">
                          <div>
                            <div className="text-[11px] font-semibold text-[#3B82F6]">
                              {"\uD83D\uDE9A"} {detail.shipping.carrier}
                            </div>
                            <div className="text-[13px] font-bold text-[#2D2420] font-mono mt-0.5">
                              {detail.shipping.trackingNumber}
                            </div>
                          </div>
                          <button className="text-[11px] font-semibold px-2.5 py-1 rounded-md border border-[#3B82F6]/30 bg-white text-[#3B82F6] cursor-pointer">
                            배송 조회
                          </button>
                        </div>
                      )}

                      {/* Items */}
                      {detail.items.map((item, i) => {
                        const fitColor = item.fitScore && item.fitScore >= 80 ? "#22C55E" : item.fitScore && item.fitScore >= 60 ? "#F59E0B" : "#EF4444";
                        return (
                          <div
                            key={i}
                            className="flex justify-between items-center py-1.5 text-[13px] text-[#5A4F48]"
                          >
                            <span>
                              {item.productName} x {item.quantity}
                            </span>
                            {item.fitScore && (
                              <span
                                className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                                style={{ background: `${fitColor}12`, color: fitColor }}
                              >
                                FIT {item.fitScore}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      <div className="flex justify-between pt-2 mt-2 border-t border-dashed border-[#E5E7EB] text-xs text-[#8B7E76]">
                        <span>{detail.payment?.method || "-"}</span>
                        <span className="font-semibold text-[#2D2420]">
                          {detail.finalAmount.toLocaleString()}원
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-[#9CA3AF] py-4 text-center">상세 정보를 불러올 수 없습니다</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
