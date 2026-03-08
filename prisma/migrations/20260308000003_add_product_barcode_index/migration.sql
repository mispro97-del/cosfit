-- Add unique index on product_masters.barcode
CREATE UNIQUE INDEX IF NOT EXISTS "product_masters_barcode_key" ON "product_masters"("barcode") WHERE "barcode" IS NOT NULL;
