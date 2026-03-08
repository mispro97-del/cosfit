// ============================================================
// COSFIT - Partner Product Registration Page
// src/app/partner/products/new/page.tsx
// ============================================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProductForm, { type ProductFormData } from "../_components/ProductForm";
import { createFullProduct } from "../actions";

export default function NewProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (data: ProductFormData) => {
    setSaving(true);
    setMessage(null);

    const result = await createFullProduct({
      productId: data.productId,
      category: data.category,
      variants: data.variants.map((v) => ({
        sku: v.sku.trim(),
        optionName: v.optionName.trim(),
        optionType: v.optionType,
        price: parseInt(v.price) || 0,
        originalPrice: v.originalPrice ? parseInt(v.originalPrice) : undefined,
        stock: parseInt(v.stock) || 0,
        lowStockAlert: parseInt(v.lowStockAlert) || 5,
      })),
      images: data.images.map((img) => ({
        imageUrl: img.imageUrl,
        isMain: img.isMain,
      })),
      description: {
        content: data.descriptionContent,
        shortDesc: data.shortDesc || undefined,
        highlights: data.highlights.length > 0 ? data.highlights : undefined,
      },
    });

    if (result.success && result.data) {
      setMessage({ type: "success", text: "제품이 등록되었습니다!" });
      setTimeout(() => {
        router.push(`/partner/products/${result.data!.id}`);
      }, 1000);
    } else {
      setMessage({
        type: "error",
        text: result.error ?? "제품 등록에 실패했습니다.",
      });
      setSaving(false);
    }
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
        <span className="text-xs text-[#6B7280]">신규 등록</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1A1D21] m-0">
            신규 제품 등록
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            제품 마스터와 연동하여 옵션, 이미지, 상세설명을 등록하세요
          </p>
        </div>
        <Link
          href="/partner/products"
          className="text-xs px-3 py-1.5 rounded-lg border border-[#E5E9ED] bg-white text-[#6B7280] no-underline hover:bg-[#F9FAFB] transition-colors"
        >
          목록으로
        </Link>
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

      {/* Product Form */}
      <ProductForm saving={saving} onSubmit={handleSubmit} />
    </div>
  );
}
