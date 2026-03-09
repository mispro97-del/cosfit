import type { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "PARTNER" | "ADMIN";
      onboardingStatus: string;
      mustChangePassword?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "USER" | "PARTNER" | "ADMIN";
    onboardingStatus: string;
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "USER" | "PARTNER" | "ADMIN";
    onboardingStatus: string;
    mustChangePassword?: boolean;
  }
}
