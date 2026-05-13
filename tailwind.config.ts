import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f7fb",
          100: "#eceefa",
          200: "#d5dafa",
          300: "#aeb6f0",
          400: "#7e89dc",
          500: "#5663c7",
          600: "#3e49a8",
          700: "#2f3884",
          800: "#1f2659",
          900: "#0f1330",
          950: "#070a1c",
        },
        accent: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        soft: "0 8px 30px rgba(0,0,0,0.08)",
        glow: "0 0 0 1px rgba(34,211,238,0.25), 0 8px 40px rgba(34,211,238,0.15)",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(ellipse at top, rgba(34,211,238,0.12), transparent 60%), radial-gradient(ellipse at bottom, rgba(126,137,220,0.10), transparent 60%)",
      },
      animation: {
        "pulse-slow": "pulse 2.6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
