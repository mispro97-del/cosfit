// ============================================================
// COSFIT - Partner Inventory Management Server Actions
// src/app/partner/inventory/actions.ts
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ── Auth Helper ──

async function getAuthenticatedPartnerId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, partnerId: true },
  });
  if (!user || user.role !== "PARTNER" || !user.partnerId) return null;
  return user.partnerId;
}

// ── Types ──

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface InventoryOverviewItem {
  variantId: string;
  sku: string;
  optionName: string;
  optionType: string;
  stock: number;
  lowStockAlert: number;
  isActive: boolean;
  price: number;
  productName: string;
  productBrand: string;
  partnerProductId: string;
}

export interface InventoryOverview {
  totalSku: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  items: InventoryOverviewItem[];
}

export interface InventoryLogItem {
  id: string;
  variantId: string;
  sku: string;
  optionName: string;
  productName: string;
  type: string;
  quantity: number;
  reason: string | null;
  createdAt: string;
}

export interface LowStockAlertItem {
  variantId: string;
  sku: string;
  optionName: string;
  productName: string;
  stock: number;
  lowStockAlert: number;
}

// ── 1. 전체 재고 현황 ──

export async function getInventoryOverview(): Promise<ActionResult<InventoryOverview>> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    const partnerProducts = await prisma.partnerProduct.findMany({
      where: { partnerId },
      include: {
        product: { include: { brand: true } },
        variants: { orderBy: { createdAt: "asc" } },
      },
    });

    const items: InventoryOverviewItem[] = [];
    let totalStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const pp of partnerProducts) {
      for (const v of pp.variants) {
        totalStock += v.stock;
        if (v.stock === 0) outOfStockCount++;
        else if (v.stock <= v.lowStockAlert) lowStockCount++;

        items.push({
          variantId: v.id,
          sku: v.sku,
          optionName: v.optionName,
          optionType: v.optionType,
          stock: v.stock,
          lowStockAlert: v.lowStockAlert,
          isActive: v.isActive,
          price: v.price,
          productName: pp.product.name,
          productBrand: pp.product.brand.name,
          partnerProductId: pp.id,
        });
      }
    }

    return {
      success: true,
      data: {
        totalSku: items.length,
        totalStock,
        lowStockCount,
        outOfStockCount,
        items,
      },
    };
  } catch (error) {
    console.error("[getInventoryOverview Error]", error);
    return { success: false, error: "재고 현황 조회에 실패했습니다." };
  }
}

// ── 2. 재고 조정 ──

export async function adjustInventory(
  variantId: string,
  type: "IN" | "OUT" | "ADJUST",
  quantity: number,
  reason?: string
): Promise<ActionResult> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  if (quantity < 0) return { success: false, error: "수량은 0 이상이어야 합니다." };

  try {
    // 소유권 확인
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { partnerProduct: true },
    });
    if (!variant || variant.partnerProduct.partnerId !== partnerId) {
      return { success: false, error: "옵션을 찾을 수 없습니다." };
    }

    let newStock: number;
    switch (type) {
      case "IN":
        newStock = variant.stock + quantity;
        break;
      case "OUT":
        newStock = Math.max(0, variant.stock - quantity);
        break;
      case "ADJUST":
        newStock = quantity;
        break;
      default:
        return { success: false, error: "유효하지 않은 조정 타입입니다." };
    }

    await prisma.$transaction([
      prisma.inventoryLog.create({
        data: {
          variantId,
          type,
          quantity,
          reason: reason || null,
        },
      }),
      prisma.productVariant.update({
        where: { id: variantId },
        data: { stock: newStock },
      }),
    ]);

    revalidatePath("/partner/inventory");
    return { success: true };
  } catch (error) {
    console.error("[adjustInventory Error]", error);
    return { success: false, error: "재고 조정에 실패했습니다." };
  }
}

// ── 3. 재고 변동 이력 ──

const LOGS_PER_PAGE = 20;

export async function getInventoryLogs(
  variantId?: string,
  page: number = 1
): Promise<ActionResult<{ logs: InventoryLogItem[]; totalPages: number }>> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    // 파트너 소유 variant IDs 조회
    const partnerProducts = await prisma.partnerProduct.findMany({
      where: { partnerId },
      select: { id: true },
    });
    const ppIds = partnerProducts.map((pp) => pp.id);

    const where = {
      variant: {
        partnerProductId: { in: ppIds },
        ...(variantId ? { id: variantId } : {}),
      },
    };

    const [totalCount, rawLogs] = await Promise.all([
      prisma.inventoryLog.count({ where }),
      prisma.inventoryLog.findMany({
        where,
        include: {
          variant: {
            include: {
              partnerProduct: {
                include: { product: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * LOGS_PER_PAGE,
        take: LOGS_PER_PAGE,
      }),
    ]);

    const logs: InventoryLogItem[] = rawLogs.map((log) => ({
      id: log.id,
      variantId: log.variantId,
      sku: log.variant.sku,
      optionName: log.variant.optionName,
      productName: log.variant.partnerProduct.product.name,
      type: log.type,
      quantity: log.quantity,
      reason: log.reason,
      createdAt: log.createdAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        logs,
        totalPages: Math.max(1, Math.ceil(totalCount / LOGS_PER_PAGE)),
      },
    };
  } catch (error) {
    console.error("[getInventoryLogs Error]", error);
    return { success: false, error: "재고 이력 조회에 실패했습니다." };
  }
}

// ── 4. 일괄 재고 조정 ──

export interface BulkAdjustment {
  variantId: string;
  type: "IN" | "OUT" | "ADJUST";
  quantity: number;
  reason?: string;
}

export async function bulkAdjustInventory(
  adjustments: BulkAdjustment[]
): Promise<ActionResult<{ successCount: number; failCount: number }>> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  if (!adjustments.length) return { success: false, error: "조정 항목이 없습니다." };

  try {
    // Verify ownership of all variants
    const variantIds = adjustments.map((a) => a.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { partnerProduct: true },
    });

    const ownedVariants = new Map<string, typeof variants[0]>();
    for (const v of variants) {
      if (v.partnerProduct.partnerId === partnerId) {
        ownedVariants.set(v.id, v);
      }
    }

    let successCount = 0;
    let failCount = 0;

    // Process each adjustment in a transaction
    const operations: any[] = [];
    for (const adj of adjustments) {
      const variant = ownedVariants.get(adj.variantId);
      if (!variant || adj.quantity < 0) {
        failCount++;
        continue;
      }

      let newStock: number;
      switch (adj.type) {
        case "IN":
          newStock = variant.stock + adj.quantity;
          break;
        case "OUT":
          newStock = Math.max(0, variant.stock - adj.quantity);
          break;
        case "ADJUST":
          newStock = adj.quantity;
          break;
        default:
          failCount++;
          continue;
      }

      operations.push(
        prisma.inventoryLog.create({
          data: {
            variantId: adj.variantId,
            type: adj.type,
            quantity: adj.quantity,
            reason: adj.reason || "일괄 조정",
          },
        })
      );
      operations.push(
        prisma.productVariant.update({
          where: { id: adj.variantId },
          data: { stock: newStock },
        })
      );
      successCount++;
    }

    if (operations.length > 0) {
      await prisma.$transaction(operations);
    }

    revalidatePath("/partner/inventory");
    return {
      success: true,
      data: { successCount, failCount },
    };
  } catch (error) {
    console.error("[bulkAdjustInventory Error]", error);
    return { success: false, error: "일괄 재고 조정에 실패했습니다." };
  }
}

// ── 5. 개별 옵션 이력 조회 ──

export async function getVariantHistory(
  variantId: string
): Promise<ActionResult<InventoryLogItem[]>> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    // Verify ownership
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        partnerProduct: {
          include: { product: true },
        },
      },
    });

    if (!variant || variant.partnerProduct.partnerId !== partnerId) {
      return { success: false, error: "옵션을 찾을 수 없습니다." };
    }

    const rawLogs = await prisma.inventoryLog.findMany({
      where: { variantId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const logs: InventoryLogItem[] = rawLogs.map((log) => ({
      id: log.id,
      variantId: log.variantId,
      sku: variant.sku,
      optionName: variant.optionName,
      productName: variant.partnerProduct.product.name,
      type: log.type,
      quantity: log.quantity,
      reason: log.reason,
      createdAt: log.createdAt.toISOString(),
    }));

    return { success: true, data: logs };
  } catch (error) {
    console.error("[getVariantHistory Error]", error);
    return { success: false, error: "이력 조회에 실패했습니다." };
  }
}

// ── 6. 재고 부족 알림 목록 ──

export async function getLowStockAlerts(): Promise<ActionResult<LowStockAlertItem[]>> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    const partnerProducts = await prisma.partnerProduct.findMany({
      where: { partnerId },
      include: {
        product: true,
        variants: {
          where: { isActive: true },
          orderBy: { stock: "asc" },
        },
      },
    });

    const alerts: LowStockAlertItem[] = [];

    for (const pp of partnerProducts) {
      for (const v of pp.variants) {
        if (v.stock <= v.lowStockAlert) {
          alerts.push({
            variantId: v.id,
            sku: v.sku,
            optionName: v.optionName,
            productName: pp.product.name,
            stock: v.stock,
            lowStockAlert: v.lowStockAlert,
          });
        }
      }
    }

    // 재고 적은 순 정렬
    alerts.sort((a, b) => a.stock - b.stock);

    return { success: true, data: alerts };
  } catch (error) {
    console.error("[getLowStockAlerts Error]", error);
    return { success: false, error: "재고 부족 알림 조회에 실패했습니다." };
  }
}
