import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#070B18", 900: "#0B1226", 800: "#131D3A" },
        brand: { 400: "#818CF8", 500: "#6366F1", 600: "#4F46E5" },
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
