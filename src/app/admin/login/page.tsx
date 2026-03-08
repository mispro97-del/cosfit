"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 기존 세션 정리 후 로그인
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/admin/data-collection",
      });

      if (result?.error) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다. (" + result.error + ")");
      } else if (result?.ok) {
        window.location.href = "/admin/data-collection";
      } else {
        setError("알 수 없는 오류가 발생했습니다.");
      }
    } catch {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0F1117",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "#141620",
          borderRadius: "12px",
          padding: "2.5rem 2rem",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1
            style={{
              color: "#FFFFFF",
              fontSize: "1.5rem",
              fontWeight: 700,
              margin: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            COSFIT
            <span
              style={{
                backgroundColor: "#DC2626",
                color: "#FFFFFF",
                fontSize: "0.7rem",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "4px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Admin
            </span>
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "0.85rem",
              marginTop: "0.5rem",
            }}
          >
            관리자 로그인
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              backgroundColor: "rgba(220,38,38,0.1)",
              border: "1px solid rgba(220,38,38,0.3)",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "1.5rem",
              color: "#FCA5A5",
              fontSize: "0.85rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.25rem" }}>
            <label
              style={{
                display: "block",
                color: "rgba(255,255,255,0.6)",
                fontSize: "0.8rem",
                fontWeight: 500,
                marginBottom: "0.4rem",
              }}
            >
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@cosfit.com"
              style={{
                width: "100%",
                padding: "0.7rem 0.9rem",
                backgroundColor: "#1A1D2B",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#FFFFFF",
                fontSize: "0.9rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.75rem" }}>
            <label
              style={{
                display: "block",
                color: "rgba(255,255,255,0.6)",
                fontSize: "0.8rem",
                fontWeight: 500,
                marginBottom: "0.4rem",
              }}
            >
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "0.7rem 0.9rem",
                backgroundColor: "#1A1D2B",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#FFFFFF",
                fontSize: "0.9rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: loading ? "#6B7280" : "#DC2626",
              color: "#FFFFFF",
              fontSize: "0.9rem",
              fontWeight: 600,
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background-color 0.2s",
            }}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.2)",
            fontSize: "0.75rem",
            marginTop: "2rem",
          }}
        >
          Authorized personnel only
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            backgroundColor: "#0F1117",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          Loading...
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
