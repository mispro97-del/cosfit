-- Fix schema drift: add missing columns to brands and ingredients tables

-- brands: add missing website column
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "website" TEXT;

-- ingredients: add missing columns
ALTER TABLE "ingredients" ADD COLUMN IF NOT EXISTS "function" TEXT[] DEFAULT '{}';
ALTER TABLE "ingredients" ADD COLUMN IF NOT EXISTS "commonAllergen" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ingredients" ADD COLUMN IF NOT EXISTS "cosDnaIrritant" INTEGER;
ALTER TABLE "ingredients" ADD COLUMN IF NOT EXISTS "cosDnaSafety" INTEGER;

-- product_masters: add missing columns if any
ALTER TABLE "product_masters" ADD COLUMN IF NOT EXISTS "stock" INTEGER NOT NULL DEFAULT 0;
