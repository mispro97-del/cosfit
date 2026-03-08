// ============================================================
// COSFIT - Partner Analytics Server Actions
// ============================================================

"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ── Auth Helper ──
async function getAuthenticatedPartner() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "PARTNER") {
    throw new Error("인증이 필요합니다.");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { partnerId: true },
  });
  if (!user?.partnerId) {
    throw new Error("파트너 정보를 찾을 수 없습니다.");
  }
  return user.partnerId;
}

// ── Types ──

export interface SalesOverviewData {
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  revenueDelta: number; // % change vs previous period
  orderCountDelta: number;
  avgOrderValueDelta: number;
  chartData: { label: string; revenue: number; orders: number }[];
}

export interface ProductPerformanceData {
  id: string;
  partnerProductId: string;
  name: string;
  category: string;
  viewCount: number;
  cartCount: number;
  purchaseCount: number;
  cartRate: number; // cart/view %
  purchaseRate: number; // purchase/cart %
  revenue: number;
  isActive: boolean;
}

export interface TopProductData {
  id: string;
  name: string;
  viewCount: number;
  cartCount: number;
  purchaseCount: number;
  conversionRate: number;
  revenue: number;
}

export interface FitScoreDistributionData {
  partnerAverage: number;
  platformAverage: number;
  distribution: { range: string; count: number }[];
  totalCompares: number;
}

// ── Actions ──

export async function getSalesOverview(
  period: "day" | "week" | "month"
): Promise<SalesOverviewData> {
  const partnerId = await getAuthenticatedPartner();

  // Determine date ranges
  const now = new Date();
  let currentStart: Date;
  let previousStart: Date;
  let previousEnd: Date;
  let groupFormat: "day" | "week" | "month";

  if (period === "day") {
    // Last 7 days
    currentStart = new Date(now);
    currentStart.setDate(now.getDate() - 6);
    currentStart.setHours(0, 0, 0, 0);
    previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 7);
    previousEnd = new Date(currentStart);
    previousEnd.setMilliseconds(-1);
    groupFormat = "day";
  } else if (period === "week") {
    // Last 4 weeks
    currentStart = new Date(now);
    currentStart.setDate(now.getDate() - 27);
    currentStart.setHours(0, 0, 0, 0);
    previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 28);
    previousEnd = new Date(currentStart);
    previousEnd.setMilliseconds(-1);
    groupFormat = "week";
  } else {
    // Last 6 months
    currentStart = new Date(now);
    currentStart.setMonth(now.getMonth() - 5);
    currentStart.setDate(1);
    currentStart.setHours(0, 0, 0, 0);
    previousStart = new Date(currentStart);
    previousStart.setMonth(previousStart.getMonth() - 6);
    previousEnd = new Date(currentStart);
    previousEnd.setMilliseconds(-1);
    groupFormat = "month";
  }

  // Get partner's product IDs
  const partnerProducts = await prisma.partnerProduct.findMany({
    where: { partnerId },
    select: { productId: true },
  });
  const productIds = partnerProducts.map((p) => p.productId);

  if (productIds.length === 0) {
    return {
      totalRevenue: 0,
      orderCount: 0,
      averageOrderValue: 0,
      revenueDelta: 0,
      orderCountDelta: 0,
      avgOrderValueDelta: 0,
      chartData: [],
    };
  }

  // Current period orders
  const currentOrders = await prisma.order.findMany({
    where: {
      orderedAt: { gte: currentStart, lte: now },
      status: { notIn: ["CANCELLED", "RETURNED"] },
      items: { some: { partnerId } },
    },
    include: {
      items: { where: { partnerId } },
    },
  });

  // Previous period orders
  const previousOrders = await prisma.order.findMany({
    where: {
      orderedAt: { gte: previousStart, lte: previousEnd },
      status: { notIn: ["CANCELLED", "RETURNED"] },
      items: { some: { partnerId } },
    },
    include: {
      items: { where: { partnerId } },
    },
  });

  // Calculate current period metrics
  let currentRevenue = 0;
  currentOrders.forEach((o) => {
    o.items.forEach((item) => {
      currentRevenue += item.totalPrice;
    });
  });
  const currentOrderCount = currentOrders.length;
  const currentAvg =
    currentOrderCount > 0
      ? Math.round(currentRevenue / currentOrderCount)
      : 0;

  // Calculate previous period metrics
  let previousRevenue = 0;
  previousOrders.forEach((o) => {
    o.items.forEach((item) => {
      previousRevenue += item.totalPrice;
    });
  });
  const previousOrderCount = previousOrders.length;
  const previousAvg =
    previousOrderCount > 0
      ? Math.round(previousRevenue / previousOrderCount)
      : 0;

  // Calculate deltas (%)
  const revenueDelta =
    previousRevenue > 0
      ? Math.round(
          ((currentRevenue - previousRevenue) / previousRevenue) * 100
        )
      : currentRevenue > 0
        ? 100
        : 0;
  const orderCountDelta =
    previousOrderCount > 0
      ? Math.round(
          ((currentOrderCount - previousOrderCount) / previousOrderCount) * 100
        )
      : currentOrderCount > 0
        ? 100
        : 0;
  const avgOrderValueDelta =
    previousAvg > 0
      ? Math.round(((currentAvg - previousAvg) / previousAvg) * 100)
      : currentAvg > 0
        ? 100
        : 0;

  // Build chart data grouped by period
  const chartMap = new Map<string, { revenue: number; orders: number }>();

  for (const order of currentOrders) {
    let label: string;
    const d = order.orderedAt;

    if (groupFormat === "day") {
      label = `${d.getMonth() + 1}/${d.getDate()}`;
    } else if (groupFormat === "week") {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}~`;
    } else {
      label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }

    const existing = chartMap.get(label) || { revenue: 0, orders: 0 };
    let orderRevenue = 0;
    order.items.forEach((item) => {
      orderRevenue += item.totalPrice;
    });
    existing.revenue += orderRevenue;
    existing.orders += 1;
    chartMap.set(label, existing);
  }

  const chartData = Array.from(chartMap.entries())
    .map(([label, data]) => ({ label, ...data }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return {
    totalRevenue: currentRevenue,
    orderCount: currentOrderCount,
    averageOrderValue: currentAvg,
    revenueDelta,
    orderCountDelta,
    avgOrderValueDelta,
    chartData,
  };
}

export async function getProductPerformance(): Promise<
  ProductPerformanceData[]
> {
  const partnerId = await getAuthenticatedPartner();

  const partnerProducts = await prisma.partnerProduct.findMany({
    where: { partnerId },
    include: {
      product: { select: { name: true, category: true, status: true } },
      variants: { select: { price: true, isActive: true } },
    },
  });

  // Get order item revenue per product
  const orderItems = await prisma.orderItem.findMany({
    where: { partnerId },
    select: { productId: true, totalPrice: true },
  });

  const revenueMap = new Map<string, number>();
  orderItems.forEach((item) => {
    revenueMap.set(
      item.productId,
      (revenueMap.get(item.productId) || 0) + item.totalPrice
    );
  });

  return partnerProducts.map((pp) => {
    const viewCount = pp.viewCount;
    const cartCount = pp.cartCount;
    const purchaseCount = pp.purchaseCount;
    const cartRate = viewCount > 0 ? (cartCount / viewCount) * 100 : 0;
    const purchaseRate = cartCount > 0 ? (purchaseCount / cartCount) * 100 : 0;

    // Revenue: from OrderItems if available, otherwise estimate from purchaseCount * first variant price
    let revenue = revenueMap.get(pp.productId) || 0;
    if (revenue === 0 && purchaseCount > 0 && pp.variants.length > 0) {
      revenue = purchaseCount * pp.variants[0].price;
    }

    return {
      id: pp.productId,
      partnerProductId: pp.id,
      name: pp.product.name,
      category: pp.product.category,
      viewCount,
      cartCount,
      purchaseCount,
      cartRate: Math.round(cartRate * 10) / 10,
      purchaseRate: Math.round(purchaseRate * 10) / 10,
      revenue,
      isActive: pp.product.status === "ACTIVE",
    };
  });
}

export async function getTopProducts(
  limit: number = 5
): Promise<TopProductData[]> {
  const products = await getProductPerformance();

  return products
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
    .map((p) => ({
      id: p.id,
      name: p.name,
      viewCount: p.viewCount,
      cartCount: p.cartCount,
      purchaseCount: p.purchaseCount,
      conversionRate: p.cartRate,
      revenue: p.revenue,
    }));
}

export async function getFitScoreDistribution(): Promise<FitScoreDistributionData> {
  const partnerId = await getAuthenticatedPartner();

  // Get partner product IDs
  const partnerProducts = await prisma.partnerProduct.findMany({
    where: { partnerId },
    select: { productId: true },
  });
  const productIds = partnerProducts.map((p) => p.productId);

  if (productIds.length === 0) {
    return {
      partnerAverage: 0,
      platformAverage: 0,
      distribution: [],
      totalCompares: 0,
    };
  }

  // Partner's compare results
  const partnerCompares = await prisma.compareResult.findMany({
    where: { productId: { in: productIds } },
    select: { fitScore: true },
  });

  // Platform-wide average
  const platformAgg = await prisma.compareResult.aggregate({
    _avg: { fitScore: true },
    _count: true,
  });

  const partnerAverage =
    partnerCompares.length > 0
      ? Math.round(
          partnerCompares.reduce((sum, c) => sum + c.fitScore, 0) /
            partnerCompares.length
        )
      : 0;

  // Build distribution buckets
  const buckets = [
    { range: "0-20", min: 0, max: 20, count: 0 },
    { range: "21-40", min: 21, max: 40, count: 0 },
    { range: "41-60", min: 41, max: 60, count: 0 },
    { range: "61-80", min: 61, max: 80, count: 0 },
    { range: "81-100", min: 81, max: 100, count: 0 },
  ];

  partnerCompares.forEach((c) => {
    const bucket = buckets.find(
      (b) => c.fitScore >= b.min && c.fitScore <= b.max
    );
    if (bucket) bucket.count++;
  });

  return {
    partnerAverage,
    platformAverage: Math.round(platformAgg._avg.fitScore || 0),
    distribution: buckets.map((b) => ({ range: b.range, count: b.count })),
    totalCompares: partnerCompares.length,
  };
}
