// ============================================================
// COSFIT - Partner Inventory Management Page
// src/app/partner/inventory/page.tsx
// ============================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getInventoryOverview,
  adjustInventory,
  getInventoryLogs,
  getLowStockAlerts,
  type InventoryOverview,
  type InventoryOverviewItem,
  type InventoryLogItem,
  type LowStockAlertItem,
} from "./actions";

type AdjustType = "IN" | "OUT" | "ADJUST";

export default function InventoryPage() {
  const [overview, setOverview] = useState<InventoryOverview | null>(null);
  const [alerts, setAlerts] = useState<LowStockAlertItem[]>([]);
  const [logs, setLogs] = useState<InventoryLogItem[]>([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 재고 조정 모달
  const [adjustModal, setAdjustModal] = useState<InventoryOverviewItem | null>(null);
  const [adjustType, setAdjustType] = useState<AdjustType>("IN");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, alertRes, logRes] = await Promise.all([
        getInventoryOverview(),
        getLowStockAlerts(),
        getInventoryLogs(undefined, 1),
      ]);

      if (ovRes.success && ovRes.data) setOverview(ovRes.data);
      else setError(ovRes.error ?? "재고 현황 조회 실패");

      if (alertRes.success && alertRes.data) setAlerts(alertRes.data);
      if (logRes.success && logRes.data) {
        setLogs(logRes.data.logs);
        setLogTotalPages(logRes.data.totalPages);
      }
    } catch {
      setError("데이터 로딩에 실패했습니다.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadLogs = async (page: number) => {
    const res = await getInventoryLogs(undefined, page);
    if (res.success && res.data) {
      setLogs(res.data.logs);
      setLogPage(page);
      setLogTotalPages(res.data.totalPages);
    }
  };

  const handleAdjust = async () => {
    if (!adjustModal) return;
    const qty = parseInt(adjustQty);
    if (isNaN(qty) || qty < 0) {
      showMessage("error", "유효한 수량을 입력해주세요.");
      return;
    }
    setAdjusting(true);
    const res = await adjustInventory(adjustModal.variantId, adjustType, qty, adjustReason || undefined);
    if (res.success) {
      showMessage("success", "재고가 조정되었습니다.");
      setAdjustModal(null);
      setAdjustQty("");
      setAdjustReason("");
      await loadData();
    } else {
      showMessage("error", res.error ?? "재고 조정에 실패했습니다.");
    }
    setAdjusting(false);
  };

  const openAdjustModal = (item: InventoryOverviewItem) => {
    setAdjustModal(item);
    setAdjustType("IN");
    setAdjustQty("");
    setAdjustReason("");
  };

  const getStockStatus = (stock: number, lowStockAlert: number) => {
    if (stock === 0) return { label: "품절", color: "text-red-600", bg: "bg-red-50 border-red-200" };
    if (stock <= lowStockAlert) return { label: "부족", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" };
    return { label: "정상", color: "text-green-600", bg: "bg-green-50 border-green-200" };
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "IN": return { label: "입고", color: "text-green-700 bg-green-50" };
      case "OUT": return { label: "출고", color: "text-red-700 bg-red-50" };
      case "ADJUST": return { label: "설정", color: "text-blue-700 bg-blue-50" };
      default: return { label: type, color: "text-gray-700 bg-gray-50" };
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-[1200px]">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded-xl" />
            <div className="h-24 bg-gray-200 rounded-xl" />
            <div className="h-24 bg-gray-200 rounded-xl" />
          </div>
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="p-8 max-w-[1200px]">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">{error ?? "재고 현황을 불러올 수 없습니다."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1A1D21] m-0">재고 관리</h1>
        <p className="text-sm text-[#9CA3AF] mt-1">SKU별 재고 현황 및 조정</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="총 SKU" value={overview.totalSku} unit="개" color="text-[#1A1D21]" />
        <SummaryCard label="총 재고" value={overview.totalStock} unit="EA" color="text-[#10B981]" />
        <SummaryCard label="재고 부족" value={overview.lowStockCount} unit="건" color="text-orange-500" />
        <SummaryCard label="품절" value={overview.outOfStockCount} unit="건" color="text-red-500" />
      </div>

      {/* Low Stock Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[#1A1D21] mb-3">재고 부족 알림</h2>
          <div className="space-y-2">
            {alerts.map((a) => (
              <div
                key={a.variantId}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                  a.stock === 0
                    ? "bg-red-50 border-red-200"
                    : "bg-orange-50 border-orange-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      a.stock === 0 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {a.stock === 0 ? "품절" : "부족"}
                  </span>
                  <div>
                    <span className="text-sm font-medium text-[#1A1D21]">{a.productName}</span>
                    <span className="text-xs text-[#6B7280] ml-2">
                      {a.optionName} ({a.sku})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-[#1A1D21]">
                    재고: {a.stock} / 임계값: {a.lowStockAlert}
                  </span>
                  <button
                    onClick={() => {
                      const item = overview.items.find((i) => i.variantId === a.variantId);
                      if (item) openAdjustModal(item);
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#10B981] text-white border-none cursor-pointer hover:bg-[#059669] transition-colors font-medium"
                  >
                    입고
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-[#1A1D21] mb-3">재고 목록</h2>
        <div className="bg-white rounded-xl border border-[#E5E9ED] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E9ED]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#9CA3AF]">제품명</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-[#9CA3AF]">SKU</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-[#9CA3AF]">옵션</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-[#9CA3AF]">현재 재고</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-[#9CA3AF]">임계값</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-[#9CA3AF]">상태</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#9CA3AF]">작업</th>
              </tr>
            </thead>
            <tbody>
              {overview.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[#9CA3AF]">
                    등록된 SKU가 없습니다.
                  </td>
                </tr>
              ) : (
                overview.items.map((item) => {
                  const status = getStockStatus(item.stock, item.lowStockAlert);
                  return (
                    <tr
                      key={item.variantId}
                      className={`border-b border-[#F3F4F6] hover:bg-[#FAFBFC] transition-colors ${
                        item.stock === 0 ? "bg-red-50/30" : item.stock <= item.lowStockAlert ? "bg-orange-50/30" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="text-[#1A1D21] font-medium">{item.productName}</div>
                        <div className="text-xs text-[#9CA3AF]">{item.productBrand}</div>
                      </td>
                      <td className="px-3 py-3 text-xs text-[#6B7280] font-mono">{item.sku}</td>
                      <td className="px-3 py-3 text-[#4B5563]">{item.optionName}</td>
                      <td className="text-center px-3 py-3">
                        <span
                          className={`font-bold ${
                            item.stock === 0
                              ? "text-red-600"
                              : item.stock <= item.lowStockAlert
                              ? "text-orange-600"
                              : "text-[#1A1D21]"
                          }`}
                        >
                          {item.stock}
                        </span>
                      </td>
                      <td className="text-center px-3 py-3 text-[#9CA3AF]">{item.lowStockAlert}</td>
                      <td className="text-center px-3 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-medium border ${status.bg} ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3">
                        <button
                          onClick={() => openAdjustModal(item)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-[#E5E9ED] bg-white text-[#4B5563] cursor-pointer hover:bg-[#F9FAFB] transition-colors font-medium"
                        >
                          조정
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inventory Logs */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-[#1A1D21] mb-3">변동 이력</h2>
        <div className="bg-white rounded-xl border border-[#E5E9ED] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E9ED]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#9CA3AF]">날짜</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-[#9CA3AF]">제품 / SKU</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-[#9CA3AF]">타입</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-[#9CA3AF]">수량</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-[#9CA3AF]">사유</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[#9CA3AF]">
                    변동 이력이 없습니다.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const typeInfo = getTypeLabel(log.type);
                  return (
                    <tr key={log.id} className="border-b border-[#F3F4F6] hover:bg-[#FAFBFC] transition-colors">
                      <td className="px-4 py-3 text-xs text-[#6B7280]">
                        {new Date(log.createdAt).toLocaleString("ko-KR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-[#1A1D21] font-medium">{log.productName}</div>
                        <div className="text-xs text-[#9CA3AF]">
                          {log.optionName} ({log.sku})
                        </div>
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="text-center px-3 py-3 font-medium text-[#1A1D21]">{log.quantity}</td>
                      <td className="px-3 py-3 text-[#6B7280]">{log.reason ?? "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {logTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-3 border-t border-[#E5E9ED]">
              <button
                onClick={() => loadLogs(logPage - 1)}
                disabled={logPage <= 1}
                className="text-xs px-3 py-1.5 rounded border border-[#E5E9ED] bg-white text-[#4B5563] cursor-pointer hover:bg-[#F9FAFB] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                이전
              </button>
              <span className="text-xs text-[#9CA3AF]">
                {logPage} / {logTotalPages}
              </span>
              <button
                onClick={() => loadLogs(logPage + 1)}
                disabled={logPage >= logTotalPages}
                className="text-xs px-3 py-1.5 rounded border border-[#E5E9ED] bg-white text-[#4B5563] cursor-pointer hover:bg-[#F9FAFB] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                다음
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Adjust Modal */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl border border-[#E5E9ED] shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-[#E5E9ED]">
              <h3 className="text-base font-bold text-[#1A1D21] m-0">재고 조정</h3>
              <p className="text-xs text-[#9CA3AF] mt-1">
                {adjustModal.productName} - {adjustModal.optionName} ({adjustModal.sku})
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-lg">
                <span className="text-xs text-[#9CA3AF]">현재 재고:</span>
                <span className="text-lg font-bold text-[#1A1D21]">{adjustModal.stock}</span>
                <span className="text-xs text-[#9CA3AF]">EA</span>
              </div>

              {/* Adjust Type */}
              <div>
                <label className="block text-xs text-[#9CA3AF] mb-2">조정 타입</label>
                <div className="flex gap-2">
                  {([
                    { value: "IN" as const, label: "입고", desc: "재고 추가" },
                    { value: "OUT" as const, label: "출고", desc: "재고 차감" },
                    { value: "ADJUST" as const, label: "설정", desc: "수량 직접 설정" },
                  ]).map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setAdjustType(t.value)}
                      className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium cursor-pointer transition-colors ${
                        adjustType === t.value
                          ? "border-[#10B981] bg-green-50 text-[#10B981]"
                          : "border-[#E5E9ED] bg-white text-[#6B7280] hover:bg-[#F9FAFB]"
                      }`}
                    >
                      <div>{t.label}</div>
                      <div className="text-[10px] font-normal mt-0.5 opacity-70">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs text-[#9CA3AF] mb-1">
                  {adjustType === "ADJUST" ? "설정할 재고 수량" : "수량"}
                </label>
                <input
                  type="number"
                  min={0}
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder={adjustType === "ADJUST" ? "새 재고 수량" : "수량 입력"}
                  className="w-full px-3 py-2 text-sm border border-[#E5E9ED] rounded-lg focus:outline-none focus:border-[#10B981] transition-colors"
                />
                {adjustQty && !isNaN(parseInt(adjustQty)) && (
                  <div className="text-xs text-[#9CA3AF] mt-1">
                    조정 후 예상 재고:{" "}
                    <span className="font-bold text-[#1A1D21]">
                      {adjustType === "IN"
                        ? adjustModal.stock + parseInt(adjustQty)
                        : adjustType === "OUT"
                        ? Math.max(0, adjustModal.stock - parseInt(adjustQty))
                        : parseInt(adjustQty)}
                    </span>{" "}
                    EA
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs text-[#9CA3AF] mb-1">사유 (선택)</label>
                <input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="예: 신규 입고, 재고 실사 조정 등"
                  className="w-full px-3 py-2 text-sm border border-[#E5E9ED] rounded-lg focus:outline-none focus:border-[#10B981] transition-colors"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#E5E9ED] flex justify-end gap-2">
              <button
                onClick={() => setAdjustModal(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-[#6B7280] border border-[#E5E9ED] cursor-pointer hover:bg-[#F9FAFB] transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAdjust}
                disabled={adjusting || !adjustQty}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#10B981] text-white border-none cursor-pointer hover:bg-[#059669] transition-colors disabled:opacity-50"
              >
                {adjusting ? "처리 중..." : "조정 적용"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Summary Card Component ──

function SummaryCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E9ED] p-5">
      <div className="text-xs text-[#9CA3AF] mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>
        {value.toLocaleString()}
        <span className="text-xs font-normal text-[#9CA3AF] ml-1">{unit}</span>
      </div>
    </div>
  );
}
