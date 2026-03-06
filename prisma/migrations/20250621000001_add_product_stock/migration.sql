-- AlterTable: Add stock field to product_masters
ALTER TABLE "product_masters" ADD COLUMN "stock" INTEGER NOT NULL DEFAULT 0;
