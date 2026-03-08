-- Add knowledge fields to ingredients
ALTER TABLE "ingredients" ADD COLUMN "knowledgeData" JSONB;
ALTER TABLE "ingredients" ADD COLUMN "knowledgeUpdatedAt" TIMESTAMP(3);

-- Create batch_jobs table
CREATE TABLE "batch_jobs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "schedule" TEXT NOT NULL DEFAULT '0 3 * * *',
    "lastRunAt" TIMESTAMP(3),
    "lastResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batch_jobs_pkey" PRIMARY KEY ("id")
);

-- Create kfda_sync_logs table
CREATE TABLE "kfda_sync_logs" (
    "id" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "processed" INTEGER NOT NULL,
    "created" INTEGER NOT NULL,
    "updated" INTEGER NOT NULL,
    "errors" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "details" JSONB,

    CONSTRAINT "kfda_sync_logs_pkey" PRIMARY KEY ("id")
);
