"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getProductDetail, getProductFitScore, addToCart } from "./actions";

type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductDetail>>>;
type FitScoreResult = Awaited<ReturnType<typeof getProductFitScore>>;

const SAFETY_COLORS: Record<string, string> = {
  SAFE: "text-green-600",
  MODERATE: "text-yellow-600",
  CAUTION: "text-orange-600",
  HAZARDOUS: "text-red-600",
  UNKNOWN: "text-gray-400",
};

const SAFETY_LABEL: Record<string, string> = {
  SAFE: "안전",
  MODERATE: "보통",
  CAUTION: "주의",
  HAZARDOUS: "위험",
  UNKNOWN: "미확인",
};

function FitScoreBadge({ score, grade }: { score: number; grade: string }) {
  let color = "bg-gray-100 text-gray-600 border-gray-200";
  if (score >= 80) color = "bg-green-50 text-green-700 border-green-200";
  else if (score >= 60) color = "bg-yellow-50 text-yellow-700 border-yellow-200";
  else if (score >= 40) color = "bg-orange-50 text-orange-700 border-orange-200";
  else if (score > 0) color = "bg-red-50 text-red-700 border-red-200";

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${color}`}>
      <span className="text-lg font-extrabold">{score}</span>
      <span className="text-xs font-semibold">{grade}</span>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={star <= rating ? "#FBBF24" : "none"}
          stroke={star <= rating ? "#FBBF24" : "#D1D5DB"}
          strokeWidth={2}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [fitScore, setFitScore] = useState<FitScoreResult>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [showAllIngredients, setShowAllIngredients] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [productData, fitScoreData] = await Promise.all([
        getProductDetail(productId),
        getProductFitScore(productId),
      ]);

      if (!productData) {
        router.push("/home");
        return;
      }

      setProduct(productData);
      setFitScore(fitScoreData);

      // Auto-select first variant
      if (productData.partnerProduct?.variants.length) {
        setSelectedVariantId(productData.partnerProduct.variants[0].id);
      }

      setLoading(false);
    }
    fetchData();
  }, [productId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) return null;

  const variants = product.partnerProduct?.variants ?? [];
  const images = product.partnerProduct?.images ?? [];
  const description = product.partnerProduct?.description;
  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? variants[0];

  const mainImage = images.find((img) => img.isMain)?.imageUrl || images[0]?.imageUrl || product.imageUrl;

  const displayedIngredients = showAllIngredients
    ? product.ingredients
    : product.ingredients.slice(0, 10);

  async function handleAddToCart() {
    if (!product) return;
    setCartLoading(true);
    setCartMessage(null);

    const result = await addToCart(product.id, 1);
    if (result.success) {
      setCartMessage("장바구니에 추가되었습니다!");
    } else {
      setCartMessage(result.error || "오류가 발생했습니다.");
    }
    setCartLoading(false);
    setTimeout(() => setCartMessage(null), 3000);
  }

  return (
    <div className="pb-24 animate-fade-in-up">
      {/* Back button */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 py-3 -mx-4 px-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          뒤로가기
        </button>
      </div>

      {/* Product Image */}
      <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-6 flex items-center justify-center">
        {mainImage ? (
          <img src={mainImage} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth={1.5} className="mx-auto">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <p className="text-xs text-gray-400 mt-2">이미지 준비중</p>
          </div>
        )}
      </div>

      {/* Image gallery thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {images.map((img, idx) => (
            <div
              key={idx}
              className="w-16 h-16 rounded-lg bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-200"
            >
              <img src={img.imageUrl} alt={img.alt || product.name} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* Product Info */}
      <div className="mb-6">
        <p className="text-xs text-gray-400 mb-1">{product.brandName} · {product.categoryLabel}</p>
        <h1 className="text-xl font-extrabold text-gray-900 leading-tight">{product.name}</h1>

        {/* Price */}
        {selectedVariant && (
          <div className="mt-3 flex items-center gap-2">
            {selectedVariant.originalPrice && selectedVariant.originalPrice > selectedVariant.price && (
              <>
                <span className="text-sm text-gray-400 line-through">
                  {selectedVariant.originalPrice.toLocaleString()}원
                </span>
                <span className="text-xs font-bold text-red-500">
                  {Math.round((1 - selectedVariant.price / selectedVariant.originalPrice) * 100)}%
                </span>
              </>
            )}
            <span className="text-xl font-extrabold text-gray-900">
              {selectedVariant.price.toLocaleString()}원
            </span>
          </div>
        )}

        {/* FIT Score */}
        {fitScore && (
          <div className="mt-4">
            <FitScoreBadge score={fitScore.fitScore} grade={fitScore.fitGrade} />
            {fitScore.summary && (
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">{fitScore.summary}</p>
            )}
          </div>
        )}
        {!fitScore && (
          <div className="mt-4">
            <Link
              href={`/compare?productId=${product.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-50 text-purple-600 text-xs font-semibold hover:bg-purple-100 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              내 피부와 FIT Score 확인하기
            </Link>
          </div>
        )}
      </div>

      {/* Variant Selector */}
      {variants.length > 1 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-2">옵션 선택</h3>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariantId(variant.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  selectedVariantId === variant.id
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                } ${variant.stock === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={variant.stock === 0}
              >
                {variant.optionName}
                {variant.stock === 0 && " (품절)"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {(description || product.description) && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3">제품 설명</h3>
          <div className="rounded-2xl bg-gray-50 p-4">
            {description?.shortDesc && (
              <p className="text-sm text-gray-700 font-medium mb-3">{description.shortDesc}</p>
            )}
            {description?.highlights && Array.isArray(description.highlights) && (
              <ul className="space-y-1.5 mb-3">
                {(description.highlights as string[]).map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-purple-500 mt-0.5">&#10003;</span>
                    {h}
                  </li>
                ))}
              </ul>
            )}
            <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {description?.content || product.description}
            </div>
          </div>
        </div>
      )}

      {/* Ingredients */}
      {product.ingredients.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3">
            전성분 ({product.ingredients.length}개)
          </h3>
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {displayedIngredients.map((ing, idx) => (
                <div key={idx} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{ing.name}</p>
                    {ing.name !== ing.nameInci && (
                      <p className="text-xs text-gray-400 truncate">{ing.nameInci}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {ing.ewgScore !== null && (
                      <span className="text-xs text-gray-400">EWG {ing.ewgScore}</span>
                    )}
                    <span className={`text-xs font-semibold ${SAFETY_COLORS[ing.safetyGrade]}`}>
                      {SAFETY_LABEL[ing.safetyGrade]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {product.ingredients.length > 10 && (
              <button
                onClick={() => setShowAllIngredients(!showAllIngredients)}
                className="w-full py-3 text-xs font-semibold text-purple-600 hover:bg-purple-50 transition-colors border-t border-gray-50"
              >
                {showAllIngredients
                  ? "접기"
                  : `전체 ${product.ingredients.length}개 성분 보기`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-900 mb-3">리뷰</h3>
        {product.reviews.length > 0 ? (
          <div className="space-y-3">
            {product.reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} />
                    <span className="text-xs text-gray-500">{review.authorName}</span>
                  </div>
                  {review.skinType && (
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                      {review.skinType}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{review.content}</p>
                {(review.pros.length > 0 || review.cons.length > 0) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {review.pros.map((pro, i) => (
                      <span key={`pro-${i}`} className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                        +{pro}
                      </span>
                    ))}
                    {review.cons.map((con, i) => (
                      <span key={`con-${i}`} className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">
                        -{con}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-300 mt-2">
                  {new Date(review.createdAt).toLocaleDateString("ko-KR")}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-400">아직 리뷰가 없습니다</p>
          </div>
        )}
      </div>

      {/* Bottom Fixed Bar - Add to Cart */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 z-20">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {selectedVariant && selectedVariant.stock > 0 ? (
            <button
              onClick={handleAddToCart}
              disabled={cartLoading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm py-3.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {cartLoading ? "추가 중..." : "장바구니 담기"}
            </button>
          ) : (
            <button
              disabled
              className="flex-1 bg-gray-200 text-gray-400 font-bold text-sm py-3.5 rounded-xl cursor-not-allowed"
            >
              {variants.length === 0 ? "준비 중" : "품절"}
            </button>
          )}
        </div>
        {cartMessage && (
          <p className="text-center text-xs mt-2 text-purple-600 font-medium">{cartMessage}</p>
        )}
      </div>
    </div>
  );
}
