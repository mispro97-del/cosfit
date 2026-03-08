// ============================================================
// COSFIT - Partner: 주문 상세 페이지
// src/app/partner/orders/[orderId]/page.tsx
// ============================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getOrderDetail,
  updateOrderStatus,
  updateShippingInfo,
  type OrderDetailView,
} from "../actions";

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

const STATUS_STEPS = [
  { key: "PAID", label: "주문 접수" },
  { key: "PREPARING", label: "상품 준비" },
  { key: "SHIPPED", label: "배송중" },
  { key: "DELIVERED", label: "배송 완료" },
];

const CARRIERS = ["CJ대한통운", "한진택배", "롯데택배", "우체국택배", "로젠택배"];

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<OrderDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  // Shipping form
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [carrier, setCarrier] = useState("CJ대한통운");
  const [trackingNumber, setTrackingNumber] = useState("");

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadOrder = useCallback(async () => {
    setLoading(true);
    const res = await getOrderDetail(orderId);
    if (res.success && res.data) {
      setOrder(res.data);
    } else {
      setError(res.error ?? "주문 정보를 불러올 수 없습니다.");
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleStatusChange = async (
    newStatus: "PAID" | "PREPARING" | "SHIPPED" | "DELIVERED"
  ) => {
    setProcessing(true);
    const res = await updateOrderStatus(orderId, newStatus);
    if (res.success) {
      showMsg("success", "주문 상태가 변경되었습니다.");
      await loadOrder();
    } else {
      showMsg("error", res.error ?? "상태 변경에 실패했습니다.");
    }
    setProcessing(false);
  };

  const handleShip = async () => {
    if (!trackingNumber) return;
    setProcessing(true);

    const shippingRes = await updateShippingInfo(orderId, carrier, trackingNumber);
    if (!shippingRes.success) {
      showMsg("error", shippingRes.error ?? "배송 정보 저장 실패");
      setProcessing(false);
      return;
    }

    const statusRes = await updateOrderStatus(orderId, "SHIPPED");
    if (statusRes.success) {
      showMsg("success", "발송 처리되었습니다.");
      setShowShippingForm(false);
      await loadOrder();
    } else {
      showMsg("error", statusRes.error ?? "발송 처리 실패");
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
      <div className="p-8 max-w-[1000px]">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-32" />
          <div className="h-10 bg-gray-200 rounded w-64" />
          <div className="h-48 bg-gray-200 rounded-xl" />
          <div className="h-32 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-8 max-w-[1000px]">
        <Link
          href="/partner/orders"
          className="text-sm text-[#6B7280] hover:text-[#1A1D21] mb-4 inline-block no-underline"
        >
          &larr; 주문 목록
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">
            {error ?? "주문 정보를 불러올 수 없습니다."}
          </p>
        </div>
      </div>
    );
  }

  const st = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PAID;
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="p-8 max-w-[1000px]">
      {/* Back Link */}
      <Link
        href="/partner/orders"
        className="text-sm text-[#6B7280] hover:text-[#1A1D21] mb-4 inline-block no-underline"
      >
        &larr; 주문 목록으로 돌아가기
      </Link>

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

      {/* Order Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1A1D21] m-0">
            주문 {order.orderNumber}
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            {formatDate(order.orderedAt)}
          </p>
        </div>
        <span className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${st.bg} ${st.text}`}>
          {st.label}
        </span>
      </div>

      {/* Status Progress (for normal flow orders) */}
      {currentStepIndex >= 0 && !["CANCELLED", "RETURN_REQUESTED", "RETURNED"].includes(order.status) && (
        <div className="bg-white rounded-xl border border-[#E5E9ED] p-5 mb-5">
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, idx) => {
              const isActive = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCurrent
                          ? "bg-[#10B981] text-white"
                          : isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {isActive && idx < currentStepIndex ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className={`text-xs mt-1.5 font-medium ${
                        isCurrent ? "text-[#10B981]" : isActive ? "text-[#4B5563]" : "text-[#9CA3AF]"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-3 mt-[-16px] ${
                        idx < currentStepIndex ? "bg-green-300" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Content (2 cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Order Items */}
          <div className="bg-white rounded-xl border border-[#E5E9ED]">
            <div className="px-5 py-3 border-b border-[#E5E9ED]">
              <h2 className="text-sm font-semibold text-[#1A1D21] m-0">
                주문 상품
              </h2>
            </div>
            <div className="divide-y divide-[#F3F4F6]">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="px-5 py-4 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium text-[#1A1D21]">
                      {item.productName}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#9CA3AF]">
                        {item.productBrand}
                      </span>
                      {item.fitScore !== null && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium">
                          FIT {item.fitScore}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-[#1A1D21]">
                      {formatPrice(item.totalPrice)}
                    </div>
                    <div className="text-xs text-[#9CA3AF] mt-0.5">
                      {formatPrice(item.unitPrice)} x {item.quantity}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Total */}
            <div className="px-5 py-4 border-t border-[#E5E9ED] bg-[#F9FAFB] space-y-1.5">
              <div className="flex justify-between text-sm text-[#6B7280]">
                <span>상품 금액</span>
                <span>{formatPrice(order.orderTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-[#6B7280]">
                <span>배송비</span>
                <span>{order.shippingFee === 0 ? "무료" : formatPrice(order.shippingFee)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>할인</span>
                  <span>-{formatPrice(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-[#1A1D21] pt-1.5 border-t border-[#E5E9ED]">
                <span>결제 금액</span>
                <span>{formatPrice(order.finalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Form (inline) */}
          {showShippingForm && order.status === "PREPARING" && (
            <div className="bg-white rounded-xl border border-purple-200 p-5">
              <h3 className="text-sm font-semibold text-[#1A1D21] mb-4">
                운송장 입력
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[#9CA3AF] mb-1">택배사</label>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E5E9ED] rounded-lg focus:outline-none focus:border-[#10B981]"
                  >
                    {CARRIERS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#9CA3AF] mb-1">운송장 번호</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="운송장 번호 입력"
                    className="w-full px-3 py-2 text-sm border border-[#E5E9ED] rounded-lg focus:outline-none focus:border-[#10B981]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowShippingForm(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-[#6B7280] border border-[#E5E9ED] cursor-pointer hover:bg-[#F9FAFB]"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleShip}
                    disabled={processing || !trackingNumber}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-[#10B981] text-white border-none cursor-pointer hover:bg-[#059669] disabled:opacity-50"
                  >
                    {processing ? "처리 중..." : "발송 확인"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Customer Info */}
          <div className="bg-white rounded-xl border border-[#E5E9ED]">
            <div className="px-5 py-3 border-b border-[#E5E9ED]">
              <h2 className="text-sm font-semibold text-[#1A1D21] m-0">
                고객 정보
              </h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              <InfoRow label="주문자" value={order.buyerName} />
              {order.shipping && (
                <>
                  <InfoRow label="수령인" value={order.shipping.recipientName} />
                  <InfoRow label="연락처" value={order.shipping.phone} />
                  <InfoRow
                    label="주소"
                    value={`(${order.shipping.zipCode}) ${order.shipping.address}${
                      order.shipping.addressDetail ? " " + order.shipping.addressDetail : ""
                    }`}
                  />
                  {order.shipping.memo && (
                    <InfoRow label="배송 메모" value={order.shipping.memo} />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Shipping Info */}
          {order.shipping && (order.shipping.carrier || order.shipping.trackingNumber) && (
            <div className="bg-white rounded-xl border border-[#E5E9ED]">
              <div className="px-5 py-3 border-b border-[#E5E9ED]">
                <h2 className="text-sm font-semibold text-[#1A1D21] m-0">
                  배송 정보
                </h2>
              </div>
              <div className="px-5 py-4 space-y-3">
                {order.shipping.carrier && (
                  <InfoRow label="택배사" value={order.shipping.carrier} />
                )}
                {order.shipping.trackingNumber && (
                  <InfoRow label="운송장" value={order.shipping.trackingNumber} mono />
                )}
                {order.shipping.shippedAt && (
                  <InfoRow label="발송일" value={formatDate(order.shipping.shippedAt)} />
                )}
                {order.shipping.deliveredAt && (
                  <InfoRow label="배송완료" value={formatDate(order.shipping.deliveredAt)} />
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-white rounded-xl border border-[#E5E9ED] p-5 space-y-2">
            <h2 className="text-sm font-semibold text-[#1A1D21] m-0 mb-3">
              주문 처리
            </h2>
            {order.status === "PAID" && (
              <button
                onClick={() => handleStatusChange("PREPARING")}
                disabled={processing}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-blue-50 text-blue-600 border-none cursor-pointer hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                주문 확인 (상품 준비)
              </button>
            )}
            {order.status === "PREPARING" && !showShippingForm && (
              <button
                onClick={() => {
                  setShowShippingForm(true);
                  setCarrier("CJ대한통운");
                  setTrackingNumber("");
                }}
                disabled={processing}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-purple-50 text-purple-600 border-none cursor-pointer hover:bg-purple-100 transition-colors disabled:opacity-50"
              >
                발송 처리
              </button>
            )}
            {order.status === "SHIPPED" && (
              <button
                onClick={() => handleStatusChange("DELIVERED")}
                disabled={processing}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-green-50 text-green-600 border-none cursor-pointer hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                배송 완료 처리
              </button>
            )}
            {["DELIVERED", "CANCELLED", "RETURNED"].includes(order.status) && (
              <p className="text-xs text-[#9CA3AF] text-center py-2">
                처리 완료된 주문입니다.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Info Row Component ──

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-[#9CA3AF] mb-0.5">{label}</div>
      <div className={`text-sm text-[#1A1D21] ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}
