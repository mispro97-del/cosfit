// ============================================================
// COSFIT - OpenAI Client Singleton
// DEPRECATED: Migrated to Claude API (see src/lib/claude.ts)
// ============================================================

// import OpenAI from "openai";
//
// const globalForOpenAI = globalThis as unknown as { openai: OpenAI };
//
// const openai =
//   globalForOpenAI.openai ??
//   new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
//   });
//
// if (process.env.NODE_ENV !== "production") globalForOpenAI.openai = openai;
//
// export default openai;

// This file is kept for reference. All AI calls now use @/lib/claude.
// If you need the Claude client, import from "@/lib/claude".
export {};
