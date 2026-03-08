-- ============================================================
-- COSFIT - Fix Schema Mismatches
-- Fixes: missing passwordHash column, OnboardingStatus enum,
--        skin_profiles columns, missing enum values
-- ============================================================

-- Fix 1: Add missing columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3);

-- Fix 2: Add missing OnboardingStatus enum values (schema vs init mismatch)
ALTER TYPE "OnboardingStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "OnboardingStatus" ADD VALUE IF NOT EXISTS 'SKIN_PROFILED';
ALTER TYPE "OnboardingStatus" ADD VALUE IF NOT EXISTS 'PRODUCTS_ADDED';
ALTER TYPE "OnboardingStatus" ADD VALUE IF NOT EXISTS 'STANDARD_READY';

-- Fix 3: (DEFAULT change is handled by app code - removed to avoid same-transaction enum use issue)

-- Fix 4: Add missing ProductStatus enum values
ALTER TYPE "ProductStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- Fix 5: Add missing IngredientSafetyGrade enum values
ALTER TYPE "IngredientSafetyGrade" ADD VALUE IF NOT EXISTS 'MODERATE';
ALTER TYPE "IngredientSafetyGrade" ADD VALUE IF NOT EXISTS 'CAUTION';
ALTER TYPE "IngredientSafetyGrade" ADD VALUE IF NOT EXISTS 'HAZARDOUS';

-- Fix 6: Add missing skin_profiles columns
ALTER TABLE "skin_profiles" ADD COLUMN IF NOT EXISTS "skinConcerns" TEXT[] DEFAULT '{}';
ALTER TABLE "skin_profiles" ADD COLUMN IF NOT EXISTS "ageGroup" TEXT;
ALTER TABLE "skin_profiles" ADD COLUMN IF NOT EXISTS "gender" "Gender";
ALTER TABLE "skin_profiles" ADD COLUMN IF NOT EXISTS "sensitivityLevel" INTEGER DEFAULT 3;

-- Fix 7: Add missing accounts columns (camelCase - Prisma default mapping)
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "refreshToken" TEXT;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "accessToken" TEXT;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "expiresAt" INTEGER;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "tokenType" TEXT;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "scope" TEXT;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "idToken" TEXT;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "sessionState" TEXT;

-- Fix 8: Add missing sessions columns
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;

-- Fix 9: Add nickname unique index if not exists
CREATE UNIQUE INDEX IF NOT EXISTS "users_nickname_key" ON "users"("nickname") WHERE "nickname" IS NOT NULL;

-- Fix 10: Add missing indexes
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
