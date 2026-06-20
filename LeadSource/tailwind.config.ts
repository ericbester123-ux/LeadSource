import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#090909",
        gold: {
          50: "#fff8e6",
          100: "#ffedb3",
          200: "#ffdf80",
          300: "#f7c948",
          400: "#d9a900",
          500: "#b88900",
          600: "#946f00",
          700: "#6f5300",
          800: "#4a3800",
          900: "#2e2300"
        }
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(247, 201, 72, 0.18), 0 20px 70px rgba(0, 0, 0, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
