import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        butter: {
          50: "#FEFCF3",
          100: "#FDF8E2",
          200: "#FAF0C5",
          300: "#F7E6A1",
          400: "#F5D76E", // Master brand accent
          500: "#E3BE46",
          600: "#C49E2C",
          700: "#9A781D",
        },
        charcoal: {
          50: "#F7F7F7",
          100: "#E8E8E8",
          200: "#CFCFCF",
          300: "#A8A8A8",
          400: "#707070",
          500: "#4A4A4A",
          600: "#333333",
          700: "#242424", // Primary typography
          800: "#1A1A1A",
          900: "#111111",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#FAF9F6",
          warm: "#F4F4F1", // Warm neutral surface
          muted: "#EBEBE6",
          border: "#E5E5DF",
          borderDark: "#D2D2CA",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        mono: [
          '"JetBrains Mono"',
          '"SF Mono"',
          "Consolas",
          '"Liberation Mono"',
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)",
        elevation: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
        focus: "0 0 0 3px rgba(245, 215, 110, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
