// ============================================================
// COSFIT - Partner Product Management Server Actions
// src/app/partner/products/actions.ts
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

export interface PartnerProductListItem {
  id: string;
  productId: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string | null;
  isPromoted: boolean;
  variantCount: number;
  totalStock: number;
  viewCount: number;
  purchaseCount: number;
  status: "active" | "out_of_stock" | "inactive";
}

export interface PartnerProductFullDetail {
  id: string;
  productId: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string | null;
  isPromoted: boolean;
  viewCount: number;
  cartCount: number;
  purchaseCount: number;
  variants: {
    id: string;
    sku: string;
    optionName: string;
    optionType: string;
    price: number;
    originalPrice: number | null;
    stock: number;
    lowStockAlert: number;
    isActive: boolean;
  }[];
  images: {
    id: string;
    imageUrl: string;
    sortOrder: number;
    isMain: boolean;
    alt: string | null;
  }[];
  description: {
    id: string;
    content: string;
    shortDesc: string | null;
    highlights: string[];
  } | null;
}

// ── 1. 내 제품 목록 ──

export async function getPartnerProducts(): Promise<ActionResult<PartnerProductListItem[]>> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    const products = await prisma.partnerProduct.findMany({
      where: { partnerId },
      include: {
        product: { include: { brand: true } },
        variants: { select: { stock: true, isActive: true } },
        images: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data: PartnerProductListItem[] = products.map((pp) => {
      const totalStock = pp.variants.reduce((sum, v) => sum + v.stock, 0);
      const hasActiveVariants = pp.variants.some((v) => v.isActive);
      const allOutOfStock = pp.variants.length > 0 && totalStock === 0;

      let status: "active" | "out_of_stock" | "inactive";
      if (!hasActiveVariants && pp.variants.length > 0) {
        status = "inactive";
      } else if (allOutOfStock) {
        status = "out_of_stock";
      } else {
        status = "active";
      }

      return {
        id: pp.id,
        productId: pp.productId,
        name: pp.product.name,
        brand: pp.product.brand.name,
        category: pp.product.category,
        imageUrl: pp.product.imageUrl,
        isPromoted: pp.isPromoted,
        variantCount: pp.variants.length,
        totalStock,
        viewCount: pp.viewCount,
        purchaseCount: pp.purchaseCount,
        status,
      };
    });

    return { success: true, data };
  } catch (error) {
    console.error("[getPartnerProducts Error]", error);
    return { success: false, error: "제품 목록 조회에 실패했습니다." };
  }
}

// ── 2. 제품 상세 ──

export async function getPartnerProductDetail(
  partnerProductId: string
): Promise<ActionResult<PartnerProductFullDetail>> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    const pp = await prisma.partnerProduct.findFirst({
      where: { id: partnerProductId, partnerId },
      include: {
        product: { include: { brand: true } },
        variants: { orderBy: { createdAt: "asc" } },
        images: { orderBy: { sortOrder: "asc" } },
        description: true,
      },
    });

    if (!pp) return { success: false, error: "제품을 찾을 수 없습니다." };

    const data: PartnerProductFullDetail = {
      id: pp.id,
      productId: pp.productId,
      name: pp.product.name,
      brand: pp.product.brand.name,
      category: pp.product.category,
      imageUrl: pp.product.imageUrl,
      isPromoted: pp.isPromoted,
      viewCount: pp.viewCount,
      cartCount: pp.cartCount,
      purchaseCount: pp.purchaseCount,
      variants: pp.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        optionName: v.optionName,
        optionType: v.optionType,
        price: v.price,
        originalPrice: v.originalPrice,
        stock: v.stock,
        lowStockAlert: v.lowStockAlert,
        isActive: v.isActive,
      })),
      images: pp.images.map((img) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        sortOrder: img.sortOrder,
        isMain: img.isMain,
        alt: img.alt,
      })),
      description: pp.description
        ? {
            id: pp.description.id,
            content: pp.description.content,
            shortDesc: pp.description.shortDesc,
            highlights: (pp.description.highlights as string[]) ?? [],
          }
        : null,
    };

    return { success: true, data };
  } catch (error) {
    console.error("[getPartnerProductDetail Error]", error);
    return { success: false, error: "제품 상세 조회에 실패했습니다." };
  }
}

// ── 3. SKU/옵션 추가 ──

export async function createProductVariant(
  partnerProductId: string,
  data: {
    sku: string;
    optionName: string;
    optionType: string;
    price: number;
    originalPrice?: number;
    stock?: number;
    lowStockAlert?: number;
  }
): Promise<ActionResult<{ id: string }>> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    // 소유권 확인
    const pp = await prisma.partnerProduct.findFirst({
      where: { id: partnerProductId, partnerId },
    });
    if (!pp) return { success: false, error: "제품을 찾을 수 없습니다." };

    // SKU 중복 확인
    const existingSku = await prisma.productVariant.findUnique({
      where: { sku: data.sku },
    });
    if (existingSku) return { success: false, error: "이미 사용 중인 SKU입니다." };

    const variant = await prisma.productVariant.create({
      data: {
        partnerProductId,
        sku: data.sku,
        optionName: data.optionName,
        optionType: data.optionType,
        price: data.price,
        originalPrice: data.originalPrice ?? null,
        stock: data.stock ?? 0,
        lowStockAlert: data.lowStockAlert ?? 5,
        isActive: true,
      },
    });

    revalidatePath(`/partner/products/${partnerProductId}`);
    return { success: true, data: { id: variant.id } };
  } catch (error) {
    console.error("[createProductVariant Error]", error);
    return { success: false, error: "옵션 추가에 실패했습니다." };
  }
}

// ── 4. SKU 수정 ──

export async function updateProductVariant(
  variantId: string,
  data: {
    optionName?: string;
    optionType?: string;
    price?: number;
    originalPrice?: number | null;
    stock?: number;
    lowStockAlert?: number;
    isActive?: boolean;
  }
): Promise<ActionResult> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    // 소유권 확인
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { partnerProduct: true },
    });
    if (!variant || variant.partnerProduct.partnerId !== partnerId) {
      return { success: false, error: "옵션을 찾을 수 없습니다." };
    }

    // 가격 변경 시 PriceHistory 기록
    const shouldRecordPrice =
      data.price !== undefined && data.price !== variant.price;

    if (shouldRecordPrice) {
      await prisma.$transaction([
        prisma.priceHistory.create({
          data: {
            variantId,
            oldPrice: variant.price,
            newPrice: data.price!,
            reason: "관리자 수정",
          },
        }),
        prisma.productVariant.update({
          where: { id: variantId },
          data: {
            ...(data.optionName !== undefined && { optionName: data.optionName }),
            ...(data.optionType !== undefined && { optionType: data.optionType }),
            ...(data.price !== undefined && { price: data.price }),
            ...(data.originalPrice !== undefined && { originalPrice: data.originalPrice }),
            ...(data.stock !== undefined && { stock: data.stock }),
            ...(data.lowStockAlert !== undefined && { lowStockAlert: data.lowStockAlert }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
          },
        }),
      ]);
    } else {
      await prisma.productVariant.update({
        where: { id: variantId },
        data: {
          ...(data.optionName !== undefined && { optionName: data.optionName }),
          ...(data.optionType !== undefined && { optionType: data.optionType }),
          ...(data.price !== undefined && { price: data.price }),
          ...(data.originalPrice !== undefined && { originalPrice: data.originalPrice }),
          ...(data.stock !== undefined && { stock: data.stock }),
          ...(data.lowStockAlert !== undefined && { lowStockAlert: data.lowStockAlert }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      });
    }

    revalidatePath(`/partner/products/${variant.partnerProductId}`);
    return { success: true };
  } catch (error) {
    console.error("[updateProductVariant Error]", error);
    return { success: false, error: "옵션 수정에 실패했습니다." };
  }
}

// ── 5. SKU 삭제 ──

export async function deleteProductVariant(variantId: string): Promise<ActionResult> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { partnerProduct: true },
    });
    if (!variant || variant.partnerProduct.partnerId !== partnerId) {
      return { success: false, error: "옵션을 찾을 수 없습니다." };
    }

    await prisma.productVariant.delete({ where: { id: variantId } });

    revalidatePath(`/partner/products/${variant.partnerProductId}`);
    return { success: true };
  } catch (error) {
    console.error("[deleteProductVariant Error]", error);
    return { success: false, error: "옵션 삭제에 실패했습니다." };
  }
}

// ── 6. 상세 설명 수정 ──

export async function updateProductDescription(
  partnerProductId: string,
  content: string,
  shortDesc?: string,
  highlights?: string[]
): Promise<ActionResult> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    const pp = await prisma.partnerProduct.findFirst({
      where: { id: partnerProductId, partnerId },
    });
    if (!pp) return { success: false, error: "제품을 찾을 수 없습니다." };

    await prisma.productDescription.upsert({
      where: { partnerProductId },
      create: {
        partnerProductId,
        content,
        shortDesc: shortDesc ?? null,
        highlights: highlights ?? [],
      },
      update: {
        content,
        shortDesc: shortDesc ?? null,
        highlights: highlights ?? [],
      },
    });

    revalidatePath(`/partner/products/${partnerProductId}`);
    return { success: true };
  } catch (error) {
    console.error("[updateProductDescription Error]", error);
    return { success: false, error: "상세 설명 수정에 실패했습니다." };
  }
}

// ── 7. 이미지 추가 ──

export async function addProductImage(
  partnerProductId: string,
  imageUrl: string,
  isMain?: boolean
): Promise<ActionResult<{ id: string }>> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    const pp = await prisma.partnerProduct.findFirst({
      where: { id: partnerProductId, partnerId },
      include: { images: { orderBy: { sortOrder: "desc" }, take: 1 } },
    });
    if (!pp) return { success: false, error: "제품을 찾을 수 없습니다." };

    const nextOrder = (pp.images[0]?.sortOrder ?? -1) + 1;

    // 메인 이미지로 설정 시 기존 메인 해제
    if (isMain) {
      await prisma.productImage.updateMany({
        where: { partnerProductId, isMain: true },
        data: { isMain: false },
      });
    }

    const image = await prisma.productImage.create({
      data: {
        partnerProductId,
        imageUrl,
        sortOrder: nextOrder,
        isMain: isMain ?? false,
      },
    });

    revalidatePath(`/partner/products/${partnerProductId}`);
    return { success: true, data: { id: image.id } };
  } catch (error) {
    console.error("[addProductImage Error]", error);
    return { success: false, error: "이미지 추가에 실패했습니다." };
  }
}

// ── 8. 이미지 삭제 ──

export async function removeProductImage(imageId: string): Promise<ActionResult> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
      include: { partnerProduct: true },
    });
    if (!image || image.partnerProduct.partnerId !== partnerId) {
      return { success: false, error: "이미지를 찾을 수 없습니다." };
    }

    await prisma.productImage.delete({ where: { id: imageId } });

    revalidatePath(`/partner/products/${image.partnerProductId}`);
    return { success: true };
  } catch (error) {
    console.error("[removeProductImage Error]", error);
    return { success: false, error: "이미지 삭제에 실패했습니다." };
  }
}

// ── 9. ProductMaster 검색 (제품 연동용) ──

export interface ProductMasterSearchItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string | null;
}

export async function searchProductMaster(
  query: string
): Promise<ActionResult<ProductMasterSearchItem[]>> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    if (!query.trim() || query.trim().length < 1) {
      return { success: true, data: [] };
    }

    const products = await prisma.productMaster.findMany({
      where: {
        OR: [
          { name: { contains: query.trim(), mode: "insensitive" } },
          { brand: { name: { contains: query.trim(), mode: "insensitive" } } },
        ],
        status: "ACTIVE",
      },
      include: { brand: true },
      take: 20,
      orderBy: { name: "asc" },
    });

    const data: ProductMasterSearchItem[] = products.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand.name,
      category: p.category,
      imageUrl: p.imageUrl,
    }));

    return { success: true, data };
  } catch (error) {
    console.error("[searchProductMaster Error]", error);
    return { success: false, error: "제품 검색에 실패했습니다." };
  }
}

// ── 10. 제품 전체 등록 (트랜잭션) ──

export interface CreateFullProductData {
  productId: string;
  category: string;
  variants: {
    sku: string;
    optionName: string;
    optionType: string;
    price: number;
    originalPrice?: number;
    stock: number;
    lowStockAlert: number;
  }[];
  images: {
    imageUrl: string;
    isMain: boolean;
  }[];
  description: {
    content: string;
    shortDesc?: string;
    highlights?: string[];
  };
}

export async function createFullProduct(
  data: CreateFullProductData
): Promise<ActionResult<{ id: string }>> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    // 제품 마스터 존재 확인
    const productMaster = await prisma.productMaster.findUnique({
      where: { id: data.productId },
    });
    if (!productMaster) {
      return { success: false, error: "연동할 제품을 찾을 수 없습니다." };
    }

    // 이미 등록된 제품인지 확인
    const existing = await prisma.partnerProduct.findUnique({
      where: { partnerId_productId: { partnerId, productId: data.productId } },
    });
    if (existing) {
      return { success: false, error: "이미 등록된 제품입니다." };
    }

    // SKU 중복 확인
    if (data.variants.length > 0) {
      const skus = data.variants.map((v) => v.sku);
      const existingSkus = await prisma.productVariant.findMany({
        where: { sku: { in: skus } },
        select: { sku: true },
      });
      if (existingSkus.length > 0) {
        return {
          success: false,
          error: `이미 사용 중인 SKU가 있습니다: ${existingSkus.map((s) => s.sku).join(", ")}`,
        };
      }
    }

    // 트랜잭션으로 전체 생성
    const result = await prisma.$transaction(async (tx) => {
      // 1. PartnerProduct 생성
      const pp = await tx.partnerProduct.create({
        data: {
          partnerId,
          productId: data.productId,
          isPromoted: false,
        },
      });

      // 2. ProductVariant[] 생성
      if (data.variants.length > 0) {
        await tx.productVariant.createMany({
          data: data.variants.map((v) => ({
            partnerProductId: pp.id,
            sku: v.sku,
            optionName: v.optionName,
            optionType: v.optionType,
            price: v.price,
            originalPrice: v.originalPrice ?? null,
            stock: v.stock,
            lowStockAlert: v.lowStockAlert,
            isActive: true,
          })),
        });
      }

      // 3. ProductImage[] 생성
      if (data.images.length > 0) {
        await tx.productImage.createMany({
          data: data.images.map((img, idx) => ({
            partnerProductId: pp.id,
            imageUrl: img.imageUrl,
            sortOrder: idx,
            isMain: img.isMain,
          })),
        });
      }

      // 4. ProductDescription 생성
      if (data.description.content.trim()) {
        await tx.productDescription.create({
          data: {
            partnerProductId: pp.id,
            content: data.description.content,
            shortDesc: data.description.shortDesc ?? null,
            highlights: data.description.highlights ?? [],
          },
        });
      }

      return pp;
    });

    revalidatePath("/partner/products");
    return { success: true, data: { id: result.id } };
  } catch (error) {
    console.error("[createFullProduct Error]", error);
    return { success: false, error: "제품 등록에 실패했습니다." };
  }
}

// ── 11. 제품 전체 수정 (트랜잭션) ──

export interface UpdateFullProductData {
  variants: {
    id?: string; // 기존 variant ID (없으면 새로 생성)
    sku: string;
    optionName: string;
    optionType: string;
    price: number;
    originalPrice?: number;
    stock: number;
    lowStockAlert: number;
    isActive: boolean;
  }[];
  images: {
    id?: string;
    imageUrl: string;
    isMain: boolean;
  }[];
  description: {
    content: string;
    shortDesc?: string;
    highlights?: string[];
  };
}

export async function updateFullProduct(
  partnerProductId: string,
  data: UpdateFullProductData
): Promise<ActionResult> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    const pp = await prisma.partnerProduct.findFirst({
      where: { id: partnerProductId, partnerId },
      include: { variants: true, images: true },
    });
    if (!pp) return { success: false, error: "제품을 찾을 수 없습니다." };

    await prisma.$transaction(async (tx) => {
      // 1. Variants: 삭제된 것 제거, 기존 수정, 새로 추가
      const existingVariantIds = pp.variants.map((v) => v.id);
      const incomingVariantIds = data.variants.filter((v) => v.id).map((v) => v.id!);
      const toDeleteVariantIds = existingVariantIds.filter(
        (id) => !incomingVariantIds.includes(id)
      );

      if (toDeleteVariantIds.length > 0) {
        await tx.productVariant.deleteMany({
          where: { id: { in: toDeleteVariantIds } },
        });
      }

      for (const v of data.variants) {
        if (v.id) {
          // 수정
          await tx.productVariant.update({
            where: { id: v.id },
            data: {
              optionName: v.optionName,
              optionType: v.optionType,
              price: v.price,
              originalPrice: v.originalPrice ?? null,
              stock: v.stock,
              lowStockAlert: v.lowStockAlert,
              isActive: v.isActive,
            },
          });
        } else {
          // 새로 추가
          await tx.productVariant.create({
            data: {
              partnerProductId,
              sku: v.sku,
              optionName: v.optionName,
              optionType: v.optionType,
              price: v.price,
              originalPrice: v.originalPrice ?? null,
              stock: v.stock,
              lowStockAlert: v.lowStockAlert,
              isActive: v.isActive,
            },
          });
        }
      }

      // 2. Images: 전체 교체 방식
      const existingImageIds = pp.images.map((img) => img.id);
      const incomingImageIds = data.images.filter((img) => img.id).map((img) => img.id!);
      const toDeleteImageIds = existingImageIds.filter(
        (id) => !incomingImageIds.includes(id)
      );

      if (toDeleteImageIds.length > 0) {
        await tx.productImage.deleteMany({
          where: { id: { in: toDeleteImageIds } },
        });
      }

      for (let i = 0; i < data.images.length; i++) {
        const img = data.images[i];
        if (img.id) {
          await tx.productImage.update({
            where: { id: img.id },
            data: {
              imageUrl: img.imageUrl,
              isMain: img.isMain,
              sortOrder: i,
            },
          });
        } else {
          await tx.productImage.create({
            data: {
              partnerProductId,
              imageUrl: img.imageUrl,
              isMain: img.isMain,
              sortOrder: i,
            },
          });
        }
      }

      // 3. Description: upsert
      await tx.productDescription.upsert({
        where: { partnerProductId },
        create: {
          partnerProductId,
          content: data.description.content,
          shortDesc: data.description.shortDesc ?? null,
          highlights: data.description.highlights ?? [],
        },
        update: {
          content: data.description.content,
          shortDesc: data.description.shortDesc ?? null,
          highlights: data.description.highlights ?? [],
        },
      });
    });

    revalidatePath(`/partner/products/${partnerProductId}`);
    revalidatePath("/partner/products");
    return { success: true };
  } catch (error) {
    console.error("[updateFullProduct Error]", error);
    return { success: false, error: "제품 수정에 실패했습니다." };
  }
}

// ── 12. 제품 삭제 ──

export async function deleteProduct(
  partnerProductId: string
): Promise<ActionResult> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    const pp = await prisma.partnerProduct.findFirst({
      where: { id: partnerProductId, partnerId },
    });
    if (!pp) return { success: false, error: "제품을 찾을 수 없습니다." };

    // Cascade로 variants, images, description 모두 삭제됨
    await prisma.partnerProduct.delete({
      where: { id: partnerProductId },
    });

    revalidatePath("/partner/products");
    return { success: true };
  } catch (error) {
    console.error("[deleteProduct Error]", error);
    return { success: false, error: "제품 삭제에 실패했습니다." };
  }
}

// ── 13. 프로모션 토글 ──

export async function toggleProductPromotion(
  partnerProductId: string
): Promise<ActionResult> {
  const partnerId = await getAuthenticatedPartnerId();
  if (!partnerId) return { success: false, error: "파트너 인증이 필요합니다." };

  try {
    const pp = await prisma.partnerProduct.findFirst({
      where: { id: partnerProductId, partnerId },
    });
    if (!pp) return { success: false, error: "제품을 찾을 수 없습니다." };

    await prisma.partnerProduct.update({
      where: { id: partnerProductId },
      data: { isPromoted: !pp.isPromoted },
    });

    revalidatePath("/partner/products");
    return { success: true };
  } catch (error) {
    console.error("[toggleProductPromotion Error]", error);
    return { success: false, error: "프로모션 설정에 실패했습니다." };
  }
}
