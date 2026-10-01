import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Remapped to the product palette. Names kept so no page code changed,
        // but the navy ink and indigo brand that leaked into older screens are gone.
        ink: { 950: "#0b0a09", 900: "#171412", 800: "#1e1a17" },
        brand: { 400: "#ffb27a", 500: "#ff8a3d", 600: "#f97316" },
      slate: {
        50: "#faf8f5", 100: "#f7f4f1", 200: "#e7e2dc", 300: "#d6cfc7",
        400: "#a8a29e", 500: "#8b847e", 600: "#6b655f", 700: "#524c47",
        800: "#383330", 900: "#221e1c", 950: "#0b0a09",
      },

      },
      fontFamily: {
        display: ["Sora", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
