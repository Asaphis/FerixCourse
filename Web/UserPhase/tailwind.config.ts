import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Remapped to the product palette - navy/indigo originals leaked into
        // pages that still use these class names.
        night: {
          950: "#0b0a09",
          900: "#12100e",
          850: "#171412",
          800: "#1e1a17",
        },
        aurora: {
          violet: "#ff8a3d",
          fuchsia: "#f43f5e",
          amber: "#FBBF24",
          mint: "#34D399",
        },
      },
      fontFamily: {
        display: ["Archivo", "system-ui", "sans-serif"],
        accent: ["Instrument Serif", "Georgia", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      slate: {
        50: "#faf8f5", 100: "#f7f4f1", 200: "#e7e2dc", 300: "#d6cfc7",
        400: "#a8a29e", 500: "#8b847e", 600: "#6b655f", 700: "#524c47",
        800: "#383330", 900: "#221e1c", 950: "#0b0a09",
      },
      keyframes: {
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-14px)" } },
        pulseRing: { "0%": { transform: "scale(1)", opacity: ".6" }, "100%": { transform: "scale(1.9)", opacity: "0" } },
        shimmer: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
      },
      animation: {
        marquee: "marquee 30s linear infinite",
        floaty: "floaty 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
