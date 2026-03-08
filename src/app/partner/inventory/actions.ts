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

// ── 4. 재고 부족 알림 목록 ──

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
