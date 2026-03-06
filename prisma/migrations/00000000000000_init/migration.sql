-- ============================================================
-- COSFIT - Initial Migration
-- CreateTable: All models from Prisma schema
-- ============================================================

-- 1. Enums
CREATE TYPE "Role" AS ENUM ('USER', 'PARTNER', 'ADMIN');
CREATE TYPE "SkinType" AS ENUM ('DRY', 'OILY', 'COMBINATION', 'NORMAL', 'SENSITIVE');
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE "OnboardingStatus" AS ENUM ('STARTED', 'SKIN_PROFILE_DONE', 'HOLY_GRAIL_DONE', 'COMPLETED');
CREATE TYPE "ProductCategory" AS ENUM ('TONER', 'SERUM', 'EMULSION', 'CREAM', 'CLEANSER', 'SUNSCREEN', 'MASK_PACK', 'OIL', 'MIST', 'EYE_CREAM', 'LIP_CARE', 'BODY_CARE', 'OTHER');
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED', 'PENDING_REVIEW');
CREATE TYPE "IngredientSafetyGrade" AS ENUM ('SAFE', 'LOW_RISK', 'MODERATE_RISK', 'HIGH_RISK', 'UNKNOWN');
CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'TERMINATED');
CREATE TYPE "PartnerTier" AS ENUM ('BASIC', 'PREMIUM', 'ENTERPRISE');
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'AI_SUMMARIZED');
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED');
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'BANK_TRANSFER', 'KAKAO_PAY', 'NAVER_PAY', 'TOSS_PAY');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- 2. Core User Tables
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "nickname" TEXT,
    "profileImage" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "gender" "Gender",
    "birthYear" INTEGER,
    "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'STARTED',
    "partnerId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_role_idx" ON "users"("role");

CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "accounts_provider_providerAccountId_key" UNIQUE ("provider", "providerAccountId")
);

CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- 3. Skin Profile
CREATE TABLE "skin_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skinType" "SkinType" NOT NULL,
    "concerns" TEXT[],
    "allergies" TEXT[],
    "sensitivityLevel" INTEGER NOT NULL DEFAULT 3,
    "preferredCategories" "ProductCategory"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "skin_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "skin_profiles_userId_key" ON "skin_profiles"("userId");

-- 4. Product & Brand
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "country" TEXT,
    "logoUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");

CREATE TABLE "product_masters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "volume" TEXT,
    "price" INTEGER,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "kfdaReportNo" TEXT,
    "barcode" TEXT,
    "rawIngredients" TEXT,
    "ingredientCount" INTEGER NOT NULL DEFAULT 0,
    "avgFitScore" DOUBLE PRECISION,
    "totalCompares" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_masters_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "product_masters_brandId_idx" ON "product_masters"("brandId");
CREATE INDEX "product_masters_category_idx" ON "product_masters"("category");
CREATE INDEX "product_masters_status_idx" ON "product_masters"("status");

-- 5. Ingredients
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "nameInci" TEXT NOT NULL,
    "nameKo" TEXT,
    "nameEn" TEXT,
    "casNumber" TEXT,
    "aliases" TEXT[],
    "category" TEXT,
    "safetyGrade" "IngredientSafetyGrade" NOT NULL DEFAULT 'UNKNOWN',
    "ewgScore" INTEGER,
    "description" TEXT,
    "isAllergen" BOOLEAN NOT NULL DEFAULT false,
    "isFragrance" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ingredients_nameInci_key" ON "ingredients"("nameInci");
CREATE INDEX "ingredients_safetyGrade_idx" ON "ingredients"("safetyGrade");

CREATE TABLE "product_ingredients" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "concentration" TEXT,
    CONSTRAINT "product_ingredients_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_ingredients_productId_ingredientId_key" UNIQUE ("productId", "ingredientId")
);
CREATE INDEX "product_ingredients_productId_idx" ON "product_ingredients"("productId");

-- 6. Holy Grail & User Standard
CREATE TABLE "holy_grail_products" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userRating" INTEGER NOT NULL DEFAULT 5,
    "userReview" TEXT,
    "skinTypeAtRegistration" "SkinType",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "holy_grail_products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "holy_grail_products_userId_productId_key" UNIQUE ("userId", "productId")
);
CREATE INDEX "holy_grail_products_userId_idx" ON "holy_grail_products"("userId");

CREATE TABLE "user_standards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "goodIngredients" JSONB NOT NULL,
    "badIngredients" JSONB NOT NULL,
    "patterns" JSONB NOT NULL,
    "sourceProductIds" TEXT[],
    "totalIngredientsAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "overlapThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_standards_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "user_standards_userId_idx" ON "user_standards"("userId");

-- 7. Compare Results
CREATE TABLE "compare_results" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "standardId" TEXT NOT NULL,
    "fitScore" INTEGER NOT NULL,
    "fitGrade" TEXT NOT NULL,
    "matchedGoodIngredients" JSONB NOT NULL,
    "matchedRiskIngredients" JSONB NOT NULL,
    "missingKeyIngredients" JSONB,
    "explanation" TEXT,
    "detailedBreakdown" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "compare_results_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "compare_results_userId_idx" ON "compare_results"("userId");
CREATE INDEX "compare_results_productId_idx" ON "compare_results"("productId");
CREATE INDEX "compare_results_fitGrade_idx" ON "compare_results"("fitGrade");
CREATE INDEX "compare_results_createdAt_idx" ON "compare_results"("createdAt");

-- 8. Partner System
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "businessNumber" TEXT NOT NULL,
    "representativeName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING',
    "tier" "PartnerTier" NOT NULL DEFAULT 'BASIC',
    "contractStartDate" TIMESTAMP(3),
    "contractEndDate" TIMESTAMP(3),
    "apiKeyHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partners_brandId_key" ON "partners"("brandId");
CREATE UNIQUE INDEX "partners_businessNumber_key" ON "partners"("businessNumber");
CREATE UNIQUE INDEX "partners_apiKeyHash_key" ON "partners"("apiKeyHash");
CREATE INDEX "partners_status_idx" ON "partners"("status");

CREATE TABLE "partner_products" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "isPromoted" BOOLEAN NOT NULL DEFAULT false,
    "customData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partner_products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "partner_products_partnerId_productId_key" UNIQUE ("partnerId", "productId")
);

CREATE TABLE "partner_stat_snapshots" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "totalCompares" INTEGER NOT NULL DEFAULT 0,
    "averageFitScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fitScoreDistribution" JSONB NOT NULL,
    "topMatchedIngredients" JSONB,
    "topRiskIngredients" JSONB,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION,
    CONSTRAINT "partner_stat_snapshots_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "partner_stat_snapshots_partnerId_periodType_periodDate_key" UNIQUE ("partnerId", "periodType", "periodDate")
);
CREATE INDEX "partner_stat_snapshots_partnerId_idx" ON "partner_stat_snapshots"("partnerId");

-- 9. Reviews
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "pros" TEXT[],
    "cons" TEXT[],
    "skinTypeAtReview" "SkinType",
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "aiSummary" TEXT,
    "aiSentiment" TEXT,
    "aiKeywords" TEXT[],
    "aiSummarizedAt" TIMESTAMP(3),
    "aiApprovedBy" TEXT,
    "aiApprovedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "reviews_productId_idx" ON "reviews"("productId");
CREATE INDEX "reviews_status_idx" ON "reviews"("status");

-- 10. Data Sync
CREATE TABLE "data_sync_logs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "itemsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorLog" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "triggeredBy" TEXT,
    CONSTRAINT "data_sync_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "data_sync_logs_source_idx" ON "data_sync_logs"("source");
CREATE INDEX "data_sync_logs_status_idx" ON "data_sync_logs"("status");

-- 11. Commerce: Cart
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cart_items_userId_productId_key" UNIQUE ("userId", "productId")
);
CREATE INDEX "cart_items_userId_idx" ON "cart_items"("userId");

-- 12. Commerce: Orders
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "shippingFee" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "finalAmount" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");
CREATE INDEX "orders_userId_idx" ON "orders"("userId");
CREATE INDEX "orders_status_idx" ON "orders"("status");
CREATE INDEX "orders_orderedAt_idx" ON "orders"("orderedAt");

CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "partnerId" TEXT,
    "productName" TEXT NOT NULL,
    "productBrand" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "fitScore" INTEGER,
    "compareId" TEXT,
    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");
CREATE INDEX "order_items_partnerId_idx" ON "order_items"("partnerId");

-- 13. Commerce: Payments
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" INTEGER NOT NULL,
    "pgProvider" TEXT,
    "pgTransactionId" TEXT,
    "approvalNumber" TEXT,
    "receiptUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "failReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payments_orderId_key" ON "payments"("orderId");
CREATE UNIQUE INDEX "payments_pgTransactionId_key" ON "payments"("pgTransactionId");
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- 14. Commerce: Shipping
CREATE TABLE "shipping_info" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "addressDetail" TEXT,
    "memo" TEXT,
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shipping_info_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "shipping_info_orderId_key" ON "shipping_info"("orderId");

-- 15. Activity Logs
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- 16. Foreign Keys
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "skin_profiles" ADD CONSTRAINT "skin_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "product_masters" ADD CONSTRAINT "product_masters_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id");
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product_masters"("id");
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id");
ALTER TABLE "holy_grail_products" ADD CONSTRAINT "holy_grail_products_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "holy_grail_products" ADD CONSTRAINT "holy_grail_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product_masters"("id");
ALTER TABLE "compare_results" ADD CONSTRAINT "compare_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "compare_results" ADD CONSTRAINT "compare_results_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product_masters"("id");
ALTER TABLE "partners" ADD CONSTRAINT "partners_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id");
ALTER TABLE "partner_products" ADD CONSTRAINT "partner_products_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE;
ALTER TABLE "partner_products" ADD CONSTRAINT "partner_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product_masters"("id");
ALTER TABLE "partner_stat_snapshots" ADD CONSTRAINT "partner_stat_snapshots_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product_masters"("id");
ALTER TABLE "users" ADD CONSTRAINT "users_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product_masters"("id");
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id");
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product_masters"("id");
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id");
ALTER TABLE "shipping_info" ADD CONSTRAINT "shipping_info_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id");
