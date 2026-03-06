// ============================================================
// COSFIT - Enhanced Middleware (RBAC + Rate Limit + Audit)
// src/middleware.ts
// ============================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

type Role = "USER" | "PARTNER" | "ADMIN";

interface RouteRule {
  pattern: RegExp;
  roles: Role[];
  redirect: string;
  rateLimit?: { windowMs: number; maxRequests: number };
}

const ROUTE_RULES: RouteRule[] = [
  { pattern: /^\/(onboarding|my-products|analysis|compare|history|profile)/, roles: ["USER", "PARTNER", "ADMIN"], redirect: "/login" },
  { pattern: /^\/(partner)\//, roles: ["PARTNER", "ADMIN"], redirect: "/login?type=partner&error=unauthorized" },
  { pattern: /^\/(admin)\//, roles: ["ADMIN"], redirect: "/login?type=admin&error=unauthorized" },
  { pattern: /^\/api\/v1\/partners/, roles: ["PARTNER", "ADMIN"], redirect: "", rateLimit: { windowMs: 60_000, maxRequests: 100 } },
  { pattern: /^\/api\/v1\/admin/, roles: ["ADMIN"], redirect: "", rateLimit: { windowMs: 60_000, maxRequests: 200 } },
  { pattern: /^\/api\/v1\/(products|search)/, roles: ["USER", "PARTNER", "ADMIN"], redirect: "", rateLimit: { windowMs: 60_000, maxRequests: 60 } },
  { pattern: /^\/api\/v1\/payment/, roles: ["USER", "PARTNER", "ADMIN"], redirect: "", rateLimit: { windowMs: 60_000, maxRequests: 30 } },
  { pattern: /^\/(shop)\//, roles: ["USER", "PARTNER", "ADMIN"], redirect: "/login" },
];

const PUBLIC_PATHS = ["/", "/login", "/signup", "/share", "/api/auth", "/api/health", "/api/v1/auth", "/api/v1/products/search", "/api/webhook"];
const STATIC_PREFIXES = ["/_next", "/images", "/favicon.ico", "/robots.txt"];

// ── Rate Limiter (In-Memory) ──

const rlStore = new Map<string, { count: number; resetAt: number }>();

function checkRL(key: string, windowMs: number, max: number) {
  const now = Date.now();
  const e = rlStore.get(key);
  if (!e || now > e.resetAt) {
    rlStore.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, resetAt: now + windowMs };
  }
  e.count += 1;
  if (e.count > max) return { ok: false, remaining: 0, resetAt: e.resetAt };
  return { ok: true, remaining: max - e.count, resetAt: e.resetAt };
}

function logAccess(req: NextRequest, uid: string | null, result: string) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[MW] ${result} ${req.nextUrl.pathname} uid=${uid ?? "anon"}`);
  }
}

// ── Main ──

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();

  // NextAuth JWT 검증
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  let userRole: Role | null = token?.role ?? null;
  let userId: string | null = token?.id ?? null;

  if (!token) {
    logAccess(request, null, "DENY");
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    if (pathname.startsWith("/partner")) loginUrl.searchParams.set("type", "partner");
    else if (pathname.startsWith("/admin")) loginUrl.searchParams.set("type", "admin");
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  for (const rule of ROUTE_RULES) {
    if (!rule.pattern.test(pathname)) continue;

    if (!userRole || !rule.roles.includes(userRole)) {
      logAccess(request, userId, "FORBIDDEN");
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: `접근 권한 없음. 필요: ${rule.roles.join(",")}`, currentRole: userRole } },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL(rule.redirect || "/", request.url));
    }

    if (rule.rateLimit && pathname.startsWith("/api/")) {
      const rlKey = `${userId ?? "anon"}:${pathname.split("/").slice(0, 4).join("/")}`;
      const rl = checkRL(rlKey, rule.rateLimit.windowMs, rule.rateLimit.maxRequests);
      if (!rl.ok) {
        logAccess(request, userId, "RATE_LIMITED");
        return NextResponse.json(
          { success: false, error: { code: "RATE_LIMITED", message: "요청 한도 초과", retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) } },
          { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
        );
      }
      const resp = NextResponse.next();
      resp.headers.set("X-RateLimit-Remaining", String(rl.remaining));
      logAccess(request, userId, "ALLOW");
      return resp;
    }

    break;
  }

  logAccess(request, userId, "ALLOW");
  const resp = NextResponse.next();
  if (userId) resp.headers.set("x-cosfit-user-id", userId);
  if (userRole) resp.headers.set("x-cosfit-user-role", userRole);
  return resp;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|eot)).*)" ],
};
