-- AlterEnum: ProductStatus에 DATA_COLLECTING, NORM_FAILED 추가
ALTER TYPE "ProductStatus" ADD VALUE IF NOT EXISTS 'DATA_COLLECTING';
ALTER TYPE "ProductStatus" ADD VALUE IF NOT EXISTS 'NORM_FAILED';

-- CreateEnum: DataSyncStatus
DO $$ BEGIN
  CREATE TYPE "DataSyncStatus" AS ENUM (
    'NONE', 'COLLECTING', 'RAW_SAVED',
    'NORMALIZING', 'SUCCESS', 'FAILED', 'QUALITY_ISSUE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: ProductMaster에 데이터 파이프라인 필드 추가
ALTER TABLE "product_masters"
  ADD COLUMN IF NOT EXISTS "rawIngredients" TEXT,
  ADD COLUMN IF NOT EXISTS "ingredientCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "dataStatus" "DataSyncStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "dataSyncedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "normFailureLog" JSONB;

-- CreateIndex: 상태 기반 필터링 최적화
CREATE INDEX IF NOT EXISTS "product_masters_status_idx" ON "product_masters"("status");
CREATE INDEX IF NOT EXISTS "product_masters_dataStatus_idx" ON "product_masters"("dataStatus");

-- AlterTable: brands에 nameKo 컬럼 추가 (init migration 누락분)
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "nameKo" TEXT;

-- CreateIndex: Brand 검색 최적화
CREATE INDEX IF NOT EXISTS "brands_name_idx" ON "brands"("name");
CREATE INDEX IF NOT EXISTS "brands_nameKo_idx" ON "brands"("nameKo");
