-- Fix product_masters schema drift: add missing columns
ALTER TABLE "product_masters" ADD COLUMN IF NOT EXISTS "subCategory" TEXT;
ALTER TABLE "product_masters" ADD COLUMN IF NOT EXISTS "kfdaData" JSONB;

-- Add missing unique index on barcode
CREATE UNIQUE INDEX IF NOT EXISTS "product_masters_barcode_key" ON "product_masters"("barcode") WHERE "barcode" IS NOT NULL;
