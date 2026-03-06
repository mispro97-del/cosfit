/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cosfit: {
          bg: "#FDFBF9",
          "bg-warm": "#F9F3ED",
          accent: "#C4816A",
          "accent-dark": "#A66B55",
          "accent-light": "#E8D4CA",
          "accent-pale": "#F5EDE8",
          text: "#2D2420",
          "text-secondary": "#8B7E76",
          "text-muted": "#B5AAA2",
          border: "#EDE6DF",
          success: "#6B9E7D",
          "success-bg": "#EDF5F0",
          warning: "#D4A054",
          risk: "#C47070",
        },
      },
      fontFamily: {
        sans: ["Noto Sans KR", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      animation: {
        "fade-in-up": "fadeInUp 0.5s ease both",
        "fade-slide-left": "fadeSlideLeft 0.5s ease both",
        "bounce-in": "bounce 0.6s ease",
        spin: "spin 1.5s linear infinite",
        pulse: "pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
