-- Fix ingredient schema drift: add missing columns

ALTER TABLE "ingredients" ADD COLUMN IF NOT EXISTS "function" TEXT[] DEFAULT '{}';
ALTER TABLE "ingredients" ADD COLUMN IF NOT EXISTS "commonAllergen" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ingredients" ADD COLUMN IF NOT EXISTS "cosDnaIrritant" INTEGER;
ALTER TABLE "ingredients" ADD COLUMN IF NOT EXISTS "cosDnaSafety" INTEGER;
