// ============================================================
// COSFIT - Admin Batch API Endpoint
// GET: Get batch status | POST: Trigger specific batch
// Protected with admin auth
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { syncAllKfdaData, syncDailyKfdaUpdates } from "@/lib/kfda/full-sync";
import { batchEnrichIngredients } from "@/lib/ai/ingredient-knowledge";

// ── Auth Guard ──

async function requireAdminApi() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return null;
  }
  return session.user;
}

// ── GET: Get batch status ──

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobs = await prisma.batchJob.findMany({
      orderBy: { type: "asc" },
    });

    const types = ["KFDA_SYNC", "INGREDIENT_KNOWLEDGE"];
    const statuses = types.map((type) => {
      const job = jobs.find((j) => j.type === type);
      return {
        type,
        enabled: job?.enabled ?? false,
        schedule: job?.schedule ?? "0 3 * * *",
        lastRunAt: job?.lastRunAt?.toISOString() ?? null,
        lastResult: job?.lastResult ?? null,
      };
    });

    return NextResponse.json({ statuses });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// ── POST: Trigger batch ──

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type } = body as { type: "kfda" | "kfda-daily" | "ingredient-knowledge" };

    if (!type) {
      return NextResponse.json(
        { error: "type is required (kfda | kfda-daily | ingredient-knowledge)" },
        { status: 400 }
      );
    }

    let result: any;

    switch (type) {
      case "kfda": {
        result = await syncAllKfdaData();

        await prisma.batchJob.upsert({
          where: { id: "kfda-sync-job" },
          update: { lastRunAt: new Date(), lastResult: result },
          create: {
            id: "kfda-sync-job",
            type: "KFDA_SYNC",
            enabled: false,
            lastRunAt: new Date(),
            lastResult: result,
          },
        });
        break;
      }

      case "kfda-daily": {
        result = await syncDailyKfdaUpdates();

        await prisma.batchJob.upsert({
          where: { id: "kfda-sync-job" },
          update: { lastRunAt: new Date(), lastResult: result },
          create: {
            id: "kfda-sync-job",
            type: "KFDA_SYNC",
            enabled: false,
            lastRunAt: new Date(),
            lastResult: result,
          },
        });
        break;
      }

      case "ingredient-knowledge": {
        const limit = body.limit ?? 100;
        result = await batchEnrichIngredients(limit);

        await prisma.batchJob.upsert({
          where: { id: "ingredient-knowledge-job" },
          update: { lastRunAt: new Date(), lastResult: result },
          create: {
            id: "ingredient-knowledge-job",
            type: "INGREDIENT_KNOWLEDGE",
            enabled: false,
            lastRunAt: new Date(),
            lastResult: result,
          },
        });
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown batch type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, type, result });
  } catch (err: any) {
    console.error("[Batch API Error]", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
