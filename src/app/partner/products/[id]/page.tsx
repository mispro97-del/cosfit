// ============================================================
// COSFIT - Partner Product Detail / Edit Page (Rewrite)
// src/app/partner/products/[id]/page.tsx
// ============================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ProductForm, {
  type ProductFormData,
  type VariantFormData,
  type ImageFormData,
} from "../_components/ProductForm";
import {
  getPartnerProductDetail,
  updateFullProduct,
  deleteProduct,
  type PartnerProductFullDetail,
} from "../actions";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<PartnerProductFullDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadProduct = useCallback(async () => {
    const result = await getPartnerProductDetail(productId);
    if (result.success && result.data) {
      setProduct(result.data);
    } else {
      setError(result.error ?? "제품을 불러올 수 없습니다.");
    }
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSubmit = async (data: ProductFormData) => {
    setSaving(true);
    setMessage(null);

    const result = await updateFullProduct(productId, {
      variants: data.variants.map((v) => ({
        id: v.id || undefined,
        sku: v.sku.trim(),
        optionName: v.optionName.trim(),
        optionType: v.optionType,
        price: parseInt(v.price) || 0,
        originalPrice: v.originalPrice ? parseInt(v.originalPrice) : undefined,
        stock: parseInt(v.stock) || 0,
        lowStockAlert: parseInt(v.lowStockAlert) || 5,
        isActive: v.isActive,
      })),
      images: data.images.map((img) => ({
        id: img.id || undefined,
        imageUrl: img.imageUrl,
        isMain: img.isMain,
      })),
      description: {
        content: data.descriptionContent,
        shortDesc: data.shortDesc || undefined,
        highlights: data.highlights.length > 0 ? data.highlights : undefined,
      },
    });

    if (result.success) {
      showMessage("success", "제품이 수정되었습니다.");
      await loadProduct();
    } else {
      showMessage("error", result.error ?? "제품 수정에 실패했습니다.");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "이 제품을 삭제하시겠습니까?\n모든 옵션, 이미지, 상세설명이 함께 삭제됩니다."
      )
    ) {
      return;
    }
    setDeleting(true);
    const result = await deleteProduct(productId);
    if (result.success) {
      router.push("/partner/products");
    } else {
      showMessage("error", result.error ?? "제품 삭제에 실패했습니다.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-[1000px]">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48" />
          <div className="h-4 bg-gray-200 rounded w-80" />
          <div className="h-10 bg-gray-200 rounded w-full mt-6" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-8 max-w-[1000px]">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">
            {error ?? "제품을 찾을 수 없습니다."}
          </p>
          <Link
            href="/partner/products"
            className="inline-block mt-3 text-sm text-[#10B981] no-underline hover:underline"
          >
            제품 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // Build initial data for ProductForm
  const initialData: ProductFormData = {
    productId: product.productId,
    productName: product.name,
    productBrand: product.brand,
    category: product.category,
    variants: product.variants.map(
      (v): VariantFormData => ({
        id: v.id,
        sku: v.sku,
        optionName: v.optionName,
        optionType: v.optionType,
        price: v.price.toString(),
        originalPrice: v.originalPrice?.toString() ?? "",
        stock: v.stock.toString(),
        lowStockAlert: v.lowStockAlert.toString(),
        isActive: v.isActive,
      })
    ),
    images: product.images.map(
      (img): ImageFormData => ({
        id: img.id,
        imageUrl: img.imageUrl,
        isMain: img.isMain,
      })
    ),
    descriptionContent: product.description?.content ?? "",
    shortDesc: product.description?.shortDesc ?? "",
    highlights: product.description?.highlights ?? [],
  };

  return (
    <div className="p-8 max-w-[1000px]">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/partner/products"
          className="text-xs text-[#9CA3AF] no-underline hover:text-[#10B981] transition-colors"
        >
          제품 관리
        </Link>
        <span className="text-xs text-[#D1D5DB] mx-2">/</span>
        <span className="text-xs text-[#6B7280]">제품 수정</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1A1D21] m-0">
            {product.name}
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            {product.brand} &middot; 조회 {product.viewCount.toLocaleString()}{" "}
            &middot; 장바구니 {product.cartCount.toLocaleString()} &middot; 구매{" "}
            {product.purchaseCount.toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/partner/products"
            className="text-xs px-3 py-1.5 rounded-lg border border-[#E5E9ED] bg-white text-[#6B7280] no-underline hover:bg-[#F9FAFB] transition-colors"
          >
            목록으로
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-200 bg-white text-red-500 cursor-pointer hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {deleting ? "삭제 중..." : "제품 삭제"}
          </button>
        </div>
      </div>

      {/* Toast Message */}
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

      {/* Product Form (Edit Mode) */}
      <ProductForm
        initialData={initialData}
        isEdit
        saving={saving}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
