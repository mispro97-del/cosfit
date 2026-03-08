// ============================================================
// COSFIT - Partner Inventory Management Page (Enhanced)
// src/app/partner/inventory/page.tsx
// ============================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getInventoryOverview,
  adjustInventory,
  getInventoryLogs,
  getLowStockAlerts,
  bulkAdjustInventory,
  getVariantHistory,
  type InventoryOverview,
  type InventoryOverviewItem,
  type InventoryLogItem,
  type LowStockAlertItem,
  type BulkAdjustment,
} from "./actions";

type AdjustType = "IN" | "OUT" | "ADJUST";

// Group variants by product
interface ProductGroup {
  partnerProductId: string;
  productName: string;
  productBrand: string;
  variants: InventoryOverviewItem[];
  totalStock: number;
}

export default function InventoryPage() {
  const [overview, setOverview] = useState<InventoryOverview | null>(null);
  const [alerts, setAlerts] = useState<LowStockAlertItem[]>([]);
  const [logs, setLogs] = useState<InventoryLogItem[]>([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Single adjust modal
  const [adjustModal, setAdjustModal] = useState<InventoryOverviewItem | null>(null);
  const [adjustType, setAdjustType] = useState<AdjustType>("IN");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // Bulk selection
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkType, setBulkType] = useState<AdjustType>("IN");
  const [bulkQty, setBulkQty] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Per-variant history
  const [variantHistory, setVariantHistory] = useState<{
    variantId: string;
    logs: InventoryLogItem[];
  } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Inline edit
  const [inlineEdit, setInlineEdit] = useState<{ variantId: string; value: string } | null>(null);

  // Expanded product groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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

      if (ovRes.success && ovRes.data) {
        setOverview(ovRes.data);
        // Auto-expand all groups initially
        const groups = new Set(ovRes.data.items.map((i) => i.partnerProductId));
        setExpandedGroups(groups);
      } else {
        setError(ovRes.error ?? "재고 현황 조회 실패");
      }

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

  // Group items by product
  const productGroups: ProductGroup[] = overview
    ? Array.from(
        overview.items
          .reduce((map, item) => {
            const key = item.partnerProductId;
            if (!map.has(key)) {
              map.set(key, {
                partnerProductId: key,
                productName: item.productName,
                productBrand: item.productBrand,
                variants: [],
                totalStock: 0,
              });
            }
            const group = map.get(key)!;
            group.variants.push(item);
            group.totalStock += item.stock;
            return map;
          }, new Map<string, ProductGroup>())
          .values()
      )
    : [];

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

  const handleInlineStockSave = async (variantId: string) => {
    if (!inlineEdit) return;
    const qty = parseInt(inlineEdit.value);
    if (isNaN(qty) || qty < 0) {
      showMessage("error", "유효한 수량을 입력해주세요.");
      return;
    }
    const res = await adjustInventory(variantId, "ADJUST", qty, "인라인 재고 수정");
    if (res.success) {
      showMessage("success", "재고가 수정되었습니다.");
      setInlineEdit(null);
      await loadData();
    } else {
      showMessage("error", res.error ?? "재고 수정에 실패했습니다.");
    }
  };

  const handleBulkAdjust = async () => {
    const qty = parseInt(bulkQty);
    if (isNaN(qty) || qty < 0 || selectedVariants.size === 0) {
      showMessage("error", "수량과 옵션을 확인해주세요.");
      return;
    }
    setBulkProcessing(true);

    const adjustments: BulkAdjustment[] = Array.from(selectedVariants).map((vid) => ({
      variantId: vid,
      type: bulkType,
      quantity: qty,
      reason: bulkReason || undefined,
    }));

    const res = await bulkAdjustInventory(adjustments);
    if (res.success && res.data) {
      showMessage(
        "success",
        `${res.data.successCount}건 성공${res.data.failCount > 0 ? `, ${res.data.failCount}건 실패` : ""}`
      );
      setSelectedVariants(new Set());
      setBulkMode(false);
      setBulkQty("");
      setBulkReason("");
      await loadData();
    } else {
      showMessage("error", res.error ?? "일괄 조정에 실패했습니다.");
    }
    setBulkProcessing(false);
  };

  const loadVariantHistory = async (variantId: string) => {
    if (variantHistory?.variantId === variantId) {
      setVariantHistory(null);
      return;
    }
    setHistoryLoading(true);
    const res = await getVariantHistory(variantId);
    if (res.success && res.data) {
      setVariantHistory({ variantId, logs: res.data });
    }
    setHistoryLoading(false);
  };

  const toggleGroup = (ppId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(ppId)) next.delete(ppId);
      else next.add(ppId);
      return next;
    });
  };

  const toggleSelectVariant = (vid: string) => {
    setSelectedVariants((prev) => {
      const next = new Set(prev);
      if (next.has(vid)) next.delete(vid);
      else next.add(vid);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!overview) return;
    if (selectedVariants.size === overview.items.length) {
      setSelectedVariants(new Set());
    } else {
      setSelectedVariants(new Set(overview.items.map((i) => i.variantId)));
    }
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
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1A1D21] m-0">재고 관리</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">제품별 재고 현황 및 조정</p>
        </div>
        <button
          onClick={() => {
            setBulkMode(!bulkMode);
            setSelectedVariants(new Set());
          }}
          className={`text-xs px-4 py-2 rounded-lg font-medium border cursor-pointer transition-colors ${
            bulkMode
              ? "bg-[#1A1D21] text-white border-[#1A1D21]"
              : "bg-white text-[#6B7280] border-[#E5E9ED] hover:bg-[#F9FAFB]"
          }`}
        >
          {bulkMode ? "일괄 조정 취소" : "일괄 조정"}
        </button>
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
        <SummaryCard label="재고 부족" value={overview.lowStockCount} unit="건" color="text-orange-500" highlight={overview.lowStockCount > 0} />
        <SummaryCard label="품절" value={overview.outOfStockCount} unit="건" color="text-red-500" highlight={overview.outOfStockCount > 0} />
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

      {/* Bulk Action Bar */}
      {bulkMode && selectedVariants.size > 0 && (
        <div className="mb-4 bg-[#1A1D21] text-white rounded-xl p-4 flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedVariants.size}개 선택됨
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={bulkType}
              onChange={(e) => setBulkType(e.target.value as AdjustType)}
              className="text-xs py-1.5 px-2 rounded-lg bg-white/10 text-white border border-white/20"
            >
              <option value="IN">입고</option>
              <option value="OUT">출고</option>
              <option value="ADJUST">설정</option>
            </select>
            <input
              type="number"
              min={0}
              value={bulkQty}
              onChange={(e) => setBulkQty(e.target.value)}
              placeholder="수량"
              className="text-xs py-1.5 px-2 rounded-lg bg-white/10 text-white border border-white/20 w-20 placeholder-white/40"
            />
            <input
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
              placeholder="사유 (선택)"
              className="text-xs py-1.5 px-2 rounded-lg bg-white/10 text-white border border-white/20 w-32 placeholder-white/40"
            />
            <button
              onClick={handleBulkAdjust}
              disabled={bulkProcessing || !bulkQty}
              className="text-xs px-4 py-1.5 rounded-lg bg-[#10B981] text-white font-semibold border-none cursor-pointer disabled:opacity-50"
            >
              {bulkProcessing ? "처리중..." : "적용"}
            </button>
          </div>
        </div>
      )}

      {/* Product-Grouped Inventory */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#1A1D21]">재고 목록</h2>
          {bulkMode && (
            <button
              onClick={toggleSelectAll}
              className="text-xs text-[#6B7280] hover:text-[#1A1D21] cursor-pointer bg-transparent border-none"
            >
              {selectedVariants.size === overview.items.length ? "전체 해제" : "전체 선택"}
            </button>
          )}
        </div>

        {productGroups.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E9ED] p-10 text-center">
            <p className="text-sm text-[#9CA3AF]">등록된 제품이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {productGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.partnerProductId);
              const hasAlert = group.variants.some(
                (v) => v.stock <= v.lowStockAlert
              );

              return (
                <div
                  key={group.partnerProductId}
                  className={`bg-white rounded-xl border overflow-hidden ${
                    hasAlert ? "border-orange-200" : "border-[#E5E9ED]"
                  }`}
                >
                  {/* Product Header */}
                  <button
                    onClick={() => toggleGroup(group.partnerProductId)}
                    className="w-full flex items-center justify-between px-5 py-3 bg-[#F9FAFB] border-b border-[#E5E9ED] cursor-pointer border-x-0 border-t-0"
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className={`w-4 h-4 text-[#9CA3AF] transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <div className="text-left">
                        <div className="text-sm font-medium text-[#1A1D21]">
                          {group.productName}
                        </div>
                        <div className="text-xs text-[#9CA3AF]">{group.productBrand}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-[#9CA3AF]">
                        {group.variants.length}개 옵션
                      </span>
                      <span className="text-sm font-bold text-[#1A1D21]">
                        총 {group.totalStock} EA
                      </span>
                    </div>
                  </button>

                  {/* Variants Table */}
                  {isExpanded && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#F3F4F6]">
                          {bulkMode && (
                            <th className="w-10 px-3 py-2" />
                          )}
                          <th className="text-left px-4 py-2 text-xs font-medium text-[#9CA3AF]">옵션</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-[#9CA3AF]">SKU</th>
                          <th className="text-center px-3 py-2 text-xs font-medium text-[#9CA3AF]">현재 재고</th>
                          <th className="text-center px-3 py-2 text-xs font-medium text-[#9CA3AF]">임계값</th>
                          <th className="text-center px-3 py-2 text-xs font-medium text-[#9CA3AF]">가격</th>
                          <th className="text-center px-3 py-2 text-xs font-medium text-[#9CA3AF]">상태</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-[#9CA3AF]">작업</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.variants.map((item) => {
                          const status = getStockStatus(item.stock, item.lowStockAlert);
                          const isEditing = inlineEdit?.variantId === item.variantId;
                          const isSelected = selectedVariants.has(item.variantId);
                          const showHistory = variantHistory?.variantId === item.variantId;

                          return (
                            <>
                              <tr
                                key={item.variantId}
                                className={`border-b border-[#F3F4F6] hover:bg-[#FAFBFC] transition-colors ${
                                  item.stock === 0
                                    ? "bg-red-50/30"
                                    : item.stock <= item.lowStockAlert
                                    ? "bg-orange-50/30"
                                    : ""
                                }`}
                              >
                                {bulkMode && (
                                  <td className="px-3 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleSelectVariant(item.variantId)}
                                      className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-[#10B981]"
                                    />
                                  </td>
                                )}
                                <td className="px-4 py-3 text-[#4B5563]">
                                  {item.optionName}
                                  <span className="text-xs text-[#9CA3AF] ml-1">({item.optionType})</span>
                                </td>
                                <td className="px-3 py-3 text-xs text-[#6B7280] font-mono">{item.sku}</td>
                                <td className="text-center px-3 py-3">
                                  {isEditing ? (
                                    <div className="flex items-center justify-center gap-1">
                                      <input
                                        type="number"
                                        min={0}
                                        value={inlineEdit.value}
                                        onChange={(e) =>
                                          setInlineEdit({ ...inlineEdit, value: e.target.value })
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") handleInlineStockSave(item.variantId);
                                          if (e.key === "Escape") setInlineEdit(null);
                                        }}
                                        className="w-16 text-center text-sm py-1 border border-[#10B981] rounded focus:outline-none"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleInlineStockSave(item.variantId)}
                                        className="text-xs px-1.5 py-1 rounded bg-[#10B981] text-white border-none cursor-pointer"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => setInlineEdit(null)}
                                        className="text-xs px-1.5 py-1 rounded bg-gray-100 text-gray-500 border-none cursor-pointer"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  ) : (
                                    <span
                                      onClick={() =>
                                        setInlineEdit({ variantId: item.variantId, value: String(item.stock) })
                                      }
                                      className={`font-bold cursor-pointer hover:underline ${
                                        item.stock === 0
                                          ? "text-red-600"
                                          : item.stock <= item.lowStockAlert
                                          ? "text-orange-600"
                                          : "text-[#1A1D21]"
                                      }`}
                                      title="클릭하여 수정"
                                    >
                                      {item.stock}
                                    </span>
                                  )}
                                </td>
                                <td className="text-center px-3 py-3 text-[#9CA3AF]">{item.lowStockAlert}</td>
                                <td className="text-center px-3 py-3 text-[#4B5563]">
                                  {item.price.toLocaleString()}원
                                </td>
                                <td className="text-center px-3 py-3">
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-md font-medium border ${status.bg} ${status.color}`}
                                  >
                                    {status.label}
                                  </span>
                                </td>
                                <td className="text-right px-4 py-3">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => loadVariantHistory(item.variantId)}
                                      className={`text-xs px-2 py-1.5 rounded-lg border cursor-pointer transition-colors font-medium ${
                                        showHistory
                                          ? "bg-blue-50 text-blue-600 border-blue-200"
                                          : "bg-white text-[#9CA3AF] border-[#E5E9ED] hover:bg-[#F9FAFB]"
                                      }`}
                                      title="이력 보기"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => openAdjustModal(item)}
                                      className="text-xs px-3 py-1.5 rounded-lg border border-[#E5E9ED] bg-white text-[#4B5563] cursor-pointer hover:bg-[#F9FAFB] transition-colors font-medium"
                                    >
                                      조정
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* Per-variant history row */}
                              {showHistory && (
                                <tr key={`${item.variantId}-history`}>
                                  <td colSpan={bulkMode ? 8 : 7} className="px-4 py-0">
                                    <div className="bg-[#F9FAFB] rounded-lg p-3 my-2 border border-[#E5E9ED]">
                                      <div className="text-xs font-semibold text-[#6B7280] mb-2">
                                        최근 변동 이력 ({item.optionName})
                                      </div>
                                      {historyLoading ? (
                                        <div className="text-xs text-[#9CA3AF] py-2">로딩 중...</div>
                                      ) : variantHistory.logs.length === 0 ? (
                                        <div className="text-xs text-[#9CA3AF] py-2">이력이 없습니다.</div>
                                      ) : (
                                        <div className="space-y-1">
                                          {variantHistory.logs.map((log) => {
                                            const tl = getTypeLabel(log.type);
                                            return (
                                              <div
                                                key={log.id}
                                                className="flex items-center gap-3 text-xs py-1"
                                              >
                                                <span className="text-[#9CA3AF] w-32">
                                                  {new Date(log.createdAt).toLocaleString("ko-KR", {
                                                    month: "2-digit",
                                                    day: "2-digit",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                  })}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded font-medium ${tl.color}`}>
                                                  {tl.label}
                                                </span>
                                                <span className="font-medium text-[#1A1D21]">{log.quantity}</span>
                                                <span className="text-[#9CA3AF]">{log.reason ?? "-"}</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Global Inventory Logs */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-[#1A1D21] mb-3">전체 변동 이력</h2>
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
  highlight,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border p-5 ${
        highlight ? "border-orange-300" : "border-[#E5E9ED]"
      }`}
    >
      <div className="text-xs text-[#9CA3AF] mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>
        {value.toLocaleString()}
        <span className="text-xs font-normal text-[#9CA3AF] ml-1">{unit}</span>
      </div>
    </div>
  );
}
