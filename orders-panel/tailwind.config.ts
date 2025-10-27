import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./__tests__/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(210 16% 85%)",
        input: "hsl(210 16% 85%)",
        ring: "#00B37E",
        background: "#F9FBFA",
        foreground: "#0B0F0E",
        brand: {
          DEFAULT: "#00C16A",
          emphasis: "#008F4B",
          soft: "#E1F9EE",
          contrast: "#071512"
        },
        muted: {
          DEFAULT: "#E8ECEB",
          foreground: "#4E5A57"
        },
        accent: {
          DEFAULT: "#CEF5DF",
          foreground: "#0B1F1A"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"]
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out"
      }
    }
  },
  plugins: [animate]
};

export default config;
