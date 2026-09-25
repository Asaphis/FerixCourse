import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#05070D",
          900: "#0A0E18",
          850: "#0D1322",
          800: "#131B30",
        },
        aurora: {
          violet: "#8B5CF6",
          fuchsia: "#D946EF",
          amber: "#FBBF24",
          mint: "#34D399",
        },
      },
      fontFamily: {
        display: ["Archivo", "system-ui", "sans-serif"],
        accent: ["Instrument Serif", "Georgia", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
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
