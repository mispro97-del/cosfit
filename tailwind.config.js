/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cosfit: {
          bg: "#FFFFFF",
          "bg-warm": "#F0FAF6",
          "bg-card": "#FFFFFF",
          "bg-ghost": "#F5FBF8",
          accent: "#10B981",
          "accent-dark": "#059669",
          "accent-deep": "#047857",
          "accent-light": "#A7F3D0",
          "accent-pale": "#ECFDF5",
          text: "#1F2937",
          "text-body": "#4B5563",
          "text-secondary": "#6B7280",
          "text-muted": "#9CA3AF",
          "text-disabled": "#D1D5DB",
          border: "#E5E7EB",
          "border-soft": "#F3F4F6",
          success: "#10B981",
          "success-bg": "#ECFDF5",
          warning: "#F59E0B",
          "warning-bg": "#FFFBEB",
          risk: "#EF4444",
          "risk-bg": "#FEF2F2",
          fair: "#F59E0B",
          "fair-bg": "#FFFBEB",
          info: "#3B82F6",
          "info-bg": "#EFF6FF",
        },
      },
      fontFamily: {
        sans: ["Noto Sans KR", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.08)",
        brand: "0 4px 14px rgba(16,185,129,0.25)",
        "brand-lg": "0 6px 20px rgba(16,185,129,0.35)",
        overlay: "0 8px 40px rgba(0,0,0,0.12)",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.5s ease both",
        "fade-slide-left": "fadeSlideLeft 0.5s ease both",
        "bounce-in": "bounce 0.6s ease",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "skeleton": "skeleton 1.5s ease-in-out infinite",
        spin: "spin 1.5s linear infinite",
        pulse: "pulse 2s ease-in-out infinite",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(40px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        skeleton: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
    },
  },
  plugins: [],
};
