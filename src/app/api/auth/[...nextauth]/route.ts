// ============================================================
// COSFIT - NextAuth v4 Handler
// app/api/auth/[...nextauth]/route.ts
// ============================================================
// JWT 전략 사용 (@next-auth/prisma-adapter 불필요)
// providers: Credentials, Google, Kakao
// ============================================================

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
