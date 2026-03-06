// ============================================================
// COSFIT - Partner: 주문·배송 관리
// app/(partner)/orders/page.tsx
// ============================================================

"use client";

import { useState } from "react";
import type { PartnerOrderItem } from "../actions";

const MOCK: PartnerOrderItem[] = [
  { id: "poi_01", orderNumber: "ORD-20250620-00391", productName: "아토베리어 365 크림", quantity: 2, unitPrice: 28000, totalPrice: 56000, orderStatus: "PAID", buyerName: "김*핏", orderedAt: "2025-06-20T09:30:00Z", carrier: null, trackingNumber: null },
  { id: "poi_02", orderNumber: "ORD-20250618-00287", productName: "아토베리어 365 크림", quantity: 1, unitPrice: 28000, totalPrice: 28000, orderStatus: "PREPARING", buyerName: "이*아", orderedAt: "2025-06-18T14:20:00Z", carrier: null, trackingNumber: null },
  { id: "poi_03", orderNumber: "ORD-20250615-00142", productName: "더마 시카 크림", quantity: 1, unitPrice: 32000, totalPrice: 32000, orderStatus: "SHIPPED", buyerName: "박*현", orderedAt: "2025-06-15T11:45:00Z", carrier: "CJ대한통운", trackingNumber: "645823197452" },
  { id: "poi_04", orderNumber: "ORD-20250612-00098", productName: "아토베리어 선크림", quantity: 3, unitPrice: 24000, totalPrice: 72000, orderStatus: "DELIVERED", buyerName: "최*정", orderedAt: "2025-06-12T08:15:00Z", carrier: "CJ대한통운", trackingNumber: "645823197128" },
  { id: "poi_05", orderNumber: "ORD-20250610-00051", productName: "아토베리어 365 크림", quantity: 1, unitPrice: 28000, totalPrice: 28000, orderStatus: "RETURN_REQUESTED", buyerName: "정*민", orderedAt: "2025-06-10T16:30:00Z", carrier: "한진택배", trackingNumber: "420987654321" },
];

const STATUS: Record<string, { label: string; bg: string; text: string }> = {
  PAID: { label: "신규 주문", bg: "bg-blue-50", text: "text-blue-600" },
  PREPARING: { label: "준비중", bg: "bg-amber-50", text: "text-amber-600" },
  SHIPPED: { label: "배송중", bg: "bg-sky-50", text: "text-sky-600" },
  DELIVERED: { label: "배송 완료", bg: "bg-green-50", text: "text-green-600" },
  CANCELLED: { label: "취소", bg: "bg-gray-100", text: "text-gray-500" },
  RETURN_REQUESTED: { label: "반품 요청", bg: "bg-orange-50", text: "text-orange-600" },
  RETURNED: { label: "반품 완료", bg: "bg-gray-100", text: "text-gray-500" },
};

const CARRIERS = ["CJ대한통운", "한진택배", "롯데택배", "우체국택배", "로젠택배"];

export default function PartnerOrdersPage() {
  const [orders, setOrders] = useState(MOCK);
  const [filter, setFilter] = useState("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [carrier, setCarrier] = useState("CJ대한통운");
  const [tracking, setTracking] = useState("");

  const filtered = filter === "ALL" ? orders : orders.filter((o) => o.orderStatus === filter);

  const confirmPrepare = (id: string) =>
    setOrders((p) => p.map((o) => (o.id === id ? { ...o, orderStatus: "PREPARING" } : o)));

  const shipOrder = (id: string) => {
    if (!tracking) return;
    setOrders((p) =>
      p.map((o) =>
        o.id === id ? { ...o, orderStatus: "SHIPPED", carrier, trackingNumber: tracking } : o
      )
    );
    setEditingId(null);
    setTracking("");
  };

  const processReturn = (id: string, approve: boolean) =>
    setOrders((p) =>
      p.map((o) =>
        o.id === id ? { ...o, orderStatus: approve ? "RETURNED" : "SHIPPED" } : o
      )
    );

  const counts = {
    ALL: orders.length,
    PAID: orders.filter((o) => o.orderStatus === "PAID").length,
    PREPARING: orders.filter((o) => o.orderStatus === "PREPARING").length,
    RETURN_REQUESTED: orders.filter((o) => o.orderStatus === "RETURN_REQUESTED").length,
  };

  return (
    <div className="p-8 max-w-[1100px]">
      <h1 className="text-xl font-bold text-[#1A1D21] m-0">🚚 주문·배송 관리</h1>
      <p className="text-sm text-[#9CA3AF] mt-1 mb-5">신규 주문 확인, 운송장 입력, 반품 처리</p>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {([
          ["ALL", "전체"],
          ["PAID", "신규"],
          ["PREPARING", "준비중"],
          ["RETURN_REQUESTED", "반품"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-none cursor-pointer transition-colors ${
              filter === key
                ? "bg-[#1A1D21] text-white"
                : "bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#4B5563]"
            }`}
          >
            {label}
            {counts[key as keyof typeof counts] > 0 && (
              <span className="ml-1 opacity-60">({counts[key as keyof typeof counts]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E9ED] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E5E9ED]">
              {["상태", "주문번호", "제품", "수량", "금액", "구매자", "일시", "작업"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-2.5 text-xs font-medium text-[#9CA3AF]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const st = STATUS[o.orderStatus] ?? STATUS.PAID;
              const isEditing = editingId === o.id;
              const date = new Date(o.orderedAt).toLocaleDateString("ko-KR", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <tr key={o.id} className="border-b border-[#F3F4F6] hover:bg-[#FAFBFC]">
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-md ${st.bg} ${st.text}`}
                    >
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#4B5563]">
                    {o.orderNumber}
                  </td>
                  <td className="px-4 py-3 font-medium text-[#1A1D21]">
                    {o.productName}
                  </td>
                  <td className="px-4 py-3 text-[#4B5563]">{o.quantity}</td>
                  <td className="px-4 py-3 font-semibold text-[#1A1D21]">
                    {o.totalPrice.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-[#4B5563]">{o.buyerName}</td>
                  <td className="px-4 py-3 text-xs text-[#9CA3AF]">{date}</td>
                  <td className="px-4 py-3">
                    {o.orderStatus === "PAID" && (
                      <button
                        onClick={() => confirmPrepare(o.id)}
                        className="text-xs px-3 py-1 rounded-md bg-blue-50 text-blue-600 font-semibold border-none cursor-pointer"
                      >
                        상품 준비
                      </button>
                    )}
                    {o.orderStatus === "PREPARING" && !isEditing && (
                      <button
                        onClick={() => {
                          setEditingId(o.id);
                          setCarrier("CJ대한통운");
                          setTracking("");
                        }}
                        className="text-xs px-3 py-1 rounded-md bg-amber-50 text-amber-600 font-semibold border-none cursor-pointer"
                      >
                        운송장 입력
                      </button>
                    )}
                    {o.orderStatus === "PREPARING" && isEditing && (
                      <div className="flex gap-1 items-center">
                        <select
                          value={carrier}
                          onChange={(e) => setCarrier(e.target.value)}
                          className="text-xs py-1 px-1.5 rounded border border-[#E5E9ED]"
                        >
                          {CARRIERS.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                        <input
                          value={tracking}
                          onChange={(e) => setTracking(e.target.value)}
                          placeholder="운송장번호"
                          className="text-xs py-1 px-2 rounded border border-[#E5E9ED] w-28"
                        />
                        <button
                          onClick={() => shipOrder(o.id)}
                          disabled={!tracking}
                          className="text-xs px-2 py-1 rounded bg-green-500 text-white font-semibold border-none cursor-pointer disabled:bg-gray-300"
                        >
                          발송
                        </button>
                      </div>
                    )}
                    {o.orderStatus === "RETURN_REQUESTED" && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => processReturn(o.id, true)}
                          className="text-xs px-2 py-1 rounded bg-red-50 text-red-500 font-semibold border-none cursor-pointer"
                        >
                          반품 승인
                        </button>
                        <button
                          onClick={() => processReturn(o.id, false)}
                          className="text-xs px-2 py-1 rounded border border-[#E5E9ED] bg-white text-[#6B7280] cursor-pointer"
                        >
                          거절
                        </button>
                      </div>
                    )}
                    {o.orderStatus === "SHIPPED" && o.trackingNumber && (
                      <span className="text-xs text-[#9CA3AF] font-mono">
                        {o.carrier} ...{o.trackingNumber.slice(-6)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
