-- Migration: add_enhancement_models
-- Description: Add all new models from enhancement program (sections 13-16)
-- Date: 2026-03-08

-- ============================================================
-- 13. USER PRODUCTS (사용자 제품 등록 - 고도화)
-- ============================================================

-- CreateTable: user_products
CREATE TABLE "user_products" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "usagePeriod" INTEGER,
    "rating" DOUBLE PRECISION,
    "review" TEXT,
    "isCurrentUse" BOOLEAN NOT NULL DEFAULT true,
    "routineType" TEXT,
    "routineOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_products_userId_productId_key" ON "user_products"("userId", "productId");
CREATE INDEX "user_products_userId_idx" ON "user_products"("userId");

-- AddForeignKey
ALTER TABLE "user_products" ADD CONSTRAINT "user_products_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_products" ADD CONSTRAINT "user_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: routine_analyses
CREATE TABLE "routine_analyses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routineType" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "resultJson" JSONB NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routine_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "routine_analyses_userId_idx" ON "routine_analyses"("userId");

-- AddForeignKey
ALTER TABLE "routine_analyses" ADD CONSTRAINT "routine_analyses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: product_recommendations
CREATE TABLE "product_recommendations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "fitScore" DOUBLE PRECISION NOT NULL,
    "priority" INTEGER NOT NULL,
    "isViewed" BOOLEAN NOT NULL DEFAULT false,
    "isPurchased" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_recommendations_userId_idx" ON "product_recommendations"("userId");

-- AddForeignKey
ALTER TABLE "product_recommendations" ADD CONSTRAINT "product_recommendations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_recommendations" ADD CONSTRAINT "product_recommendations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- 14. INGREDIENT RELATIONS (성분 관계 - 관리자 고도화)
-- ============================================================

-- CreateTable: ingredient_synonyms
CREATE TABLE "ingredient_synonyms" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "synonym" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ko',
    "source" TEXT,

    CONSTRAINT "ingredient_synonyms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_synonyms_ingredientId_synonym_key" ON "ingredient_synonyms"("ingredientId", "synonym");
CREATE INDEX "ingredient_synonyms_synonym_idx" ON "ingredient_synonyms"("synonym");

-- AddForeignKey
ALTER TABLE "ingredient_synonyms" ADD CONSTRAINT "ingredient_synonyms_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: ingredient_interactions
CREATE TABLE "ingredient_interactions" (
    "id" TEXT NOT NULL,
    "ingredientAId" TEXT NOT NULL,
    "ingredientBId" TEXT NOT NULL,
    "interactionType" TEXT NOT NULL,
    "description" TEXT,
    "severity" INTEGER,
    "evidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingredient_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_interactions_ingredientAId_ingredientBId_key" ON "ingredient_interactions"("ingredientAId", "ingredientBId");

-- AddForeignKey
ALTER TABLE "ingredient_interactions" ADD CONSTRAINT "ingredient_interactions_ingredientAId_fkey" FOREIGN KEY ("ingredientAId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ingredient_interactions" ADD CONSTRAINT "ingredient_interactions_ingredientBId_fkey" FOREIGN KEY ("ingredientBId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- 15. COLLECTED REVIEWS & TRENDS (리뷰 수집 - 관리자 고도화)
-- ============================================================

-- CreateTable: collected_reviews
CREATE TABLE "collected_reviews" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "content" TEXT NOT NULL,
    "rating" DOUBLE PRECISION,
    "sentiment" TEXT,
    "skinType" TEXT,
    "keywords" JSONB,
    "authorName" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collected_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collected_reviews_productId_idx" ON "collected_reviews"("productId");
CREATE INDEX "collected_reviews_source_idx" ON "collected_reviews"("source");

-- AddForeignKey
ALTER TABLE "collected_reviews" ADD CONSTRAINT "collected_reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: product_trends
CREATE TABLE "product_trends" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "buzzCount" INTEGER NOT NULL,
    "trendScore" DOUBLE PRECISION NOT NULL,
    "sources" JSONB NOT NULL,

    CONSTRAINT "product_trends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_trends_productId_period_key" ON "product_trends"("productId", "period");

-- AddForeignKey
ALTER TABLE "product_trends" ADD CONSTRAINT "product_trends_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: data_quality_logs
CREATE TABLE "data_quality_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "missingRate" DOUBLE PRECISION NOT NULL,
    "details" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_quality_logs_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- 16. PARTNER MARKETPLACE (파트너 오픈마켓 - 고도화)
-- ============================================================

-- AlterTable: partner_products - add viewCount, cartCount, purchaseCount
ALTER TABLE "partner_products" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "partner_products" ADD COLUMN "cartCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "partner_products" ADD COLUMN "purchaseCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: product_variants
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "partnerProductId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "optionType" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "originalPrice" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "lowStockAlert" INTEGER NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");
CREATE INDEX "product_variants_partnerProductId_idx" ON "product_variants"("partnerProductId");

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_partnerProductId_fkey" FOREIGN KEY ("partnerProductId") REFERENCES "partner_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: product_images
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "partnerProductId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "alt" TEXT,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_images_partnerProductId_idx" ON "product_images"("partnerProductId");

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_partnerProductId_fkey" FOREIGN KEY ("partnerProductId") REFERENCES "partner_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: product_descriptions
CREATE TABLE "product_descriptions" (
    "id" TEXT NOT NULL,
    "partnerProductId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "shortDesc" TEXT,
    "highlights" JSONB,

    CONSTRAINT "product_descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_descriptions_partnerProductId_key" ON "product_descriptions"("partnerProductId");

-- AddForeignKey
ALTER TABLE "product_descriptions" ADD CONSTRAINT "product_descriptions_partnerProductId_fkey" FOREIGN KEY ("partnerProductId") REFERENCES "partner_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: price_histories
CREATE TABLE "price_histories" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "oldPrice" INTEGER NOT NULL,
    "newPrice" INTEGER NOT NULL,
    "reason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_histories_variantId_idx" ON "price_histories"("variantId");

-- AddForeignKey
ALTER TABLE "price_histories" ADD CONSTRAINT "price_histories_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: inventory_logs
CREATE TABLE "inventory_logs" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_logs_variantId_idx" ON "inventory_logs"("variantId");

-- AddForeignKey
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: coupons
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "minOrderAmount" INTEGER,
    "maxDiscount" INTEGER,
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");
CREATE INDEX "coupons_partnerId_idx" ON "coupons"("partnerId");
CREATE INDEX "coupons_code_idx" ON "coupons"("code");

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: coupon_usages
CREATE TABLE "coupon_usages" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_usages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: promotions
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promotions_partnerId_idx" ON "promotions"("partnerId");

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: promotion_products
CREATE TABLE "promotion_products" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "partnerProductId" TEXT NOT NULL,
    "specialPrice" INTEGER,

    CONSTRAINT "promotion_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promotion_products_promotionId_partnerProductId_key" ON "promotion_products"("promotionId", "partnerProductId");

-- AddForeignKey
ALTER TABLE "promotion_products" ADD CONSTRAINT "promotion_products_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promotion_products" ADD CONSTRAINT "promotion_products_partnerProductId_fkey" FOREIGN KEY ("partnerProductId") REFERENCES "partner_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
