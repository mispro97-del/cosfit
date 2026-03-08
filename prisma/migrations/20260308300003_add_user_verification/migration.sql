-- AlterTable: Add email verification fields to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerifyToken" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerifyExpires" TIMESTAMP(3);
