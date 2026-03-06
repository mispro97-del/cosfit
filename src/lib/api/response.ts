import { NextResponse } from "next/server";
import type { ApiResponse, PaginationMeta } from "@/types";

export function successResponse<T>(data: T, meta?: PaginationMeta, status = 200) {
  const body: ApiResponse<T> = { success: true, data };
  if (meta) body.meta = meta;
  return NextResponse.json(body, { status });
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, string[]>
) {
  const body: ApiResponse = {
    success: false,
    error: { code, message, details },
  };
  return NextResponse.json(body, { status });
}

export function paginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

export const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  RATE_LIMIT: "RATE_LIMIT",
  AI_PROCESSING_ERROR: "AI_PROCESSING_ERROR",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
} as const;
