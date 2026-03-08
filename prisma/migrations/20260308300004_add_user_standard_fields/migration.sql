-- AlterTable: Align user_standards with current schema
-- Rename old columns and add missing columns

-- Rename existing columns to match schema
ALTER TABLE "user_standards" RENAME COLUMN "goodIngredients" TO "preferredIngredients";
ALTER TABLE "user_standards" RENAME COLUMN "badIngredients" TO "avoidIngredients";
ALTER TABLE "user_standards" RENAME COLUMN "patterns" TO "ingredientPatterns";

-- Add new columns
ALTER TABLE "user_standards" ADD COLUMN IF NOT EXISTS "categoryPreferences" JSONB;
ALTER TABLE "user_standards" ADD COLUMN IF NOT EXISTS "analysisModel" TEXT NOT NULL DEFAULT 'cosfit-v1';
ALTER TABLE "user_standards" ADD COLUMN IF NOT EXISTS "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "user_standards" ADD COLUMN IF NOT EXISTS "basedOnProductCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user_standards" ADD COLUMN IF NOT EXISTS "lastAnalyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Drop old columns that no longer exist in schema
ALTER TABLE "user_standards" DROP COLUMN IF EXISTS "sourceProductIds";
ALTER TABLE "user_standards" DROP COLUMN IF EXISTS "totalIngredientsAnalyzed";
ALTER TABLE "user_standards" DROP COLUMN IF EXISTS "overlapThreshold";
ALTER TABLE "user_standards" DROP COLUMN IF EXISTS "isActive";
ALTER TABLE "user_standards" DROP COLUMN IF EXISTS "generatedAt";

-- Add unique constraint on userId if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_standards_userId_key'
  ) THEN
    ALTER TABLE "user_standards" ADD CONSTRAINT "user_standards_userId_key" UNIQUE ("userId");
  END IF;
END $$;
