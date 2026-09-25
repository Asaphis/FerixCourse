import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#050A1F",
          900: "#0A1230",
          800: "#111C4A",
        },
        brand: {
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
        },
        neon: {
          cyan: "#22D3EE",
          violet: "#A78BFA",
          lime: "#A3E635",
        },
      },
      fontFamily: {
        display: ["Sora", "Space Grotesk", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(99,102,241,.55)",
        card: "0 20px 60px -20px rgba(2,6,23,.7)",
      },
      keyframes: {
        aurora: {
          "0%,100%": { transform: "translate(0,0) scale(1)", opacity: ".8" },
          "50%": { transform: "translate(4%, -6%) scale(1.12)", opacity: "1" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        gridpan: {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "60px 60px" },
        },
      },
      animation: {
        aurora: "aurora 12s ease-in-out infinite",
        "aurora-slow": "aurora 18s ease-in-out infinite",
        floaty: "floaty 6s ease-in-out infinite",
        marquee: "marquee 28s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
