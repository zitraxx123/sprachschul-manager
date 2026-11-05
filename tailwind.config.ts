import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          50: "#F3F2FF", 100: "#E7E5FF", 200: "#CFCBFF", 300: "#B0AAFF", 400: "#8F88FF",
          500: "#7770FF", 600: "#635BFF", 700: "#5249E6", 800: "#4239BD", 900: "#352E94", 950: "#221D63",
        },
        slate: {
          50: "#F6F9FC", 100: "#EDF1F7", 200: "#E3E8EE", 300: "#C8D1DE", 400: "#8A97AB",
          500: "#5B6B80", 600: "#425466", 700: "#2B3C53", 800: "#18263D", 900: "#0F1B2F", 950: "#0A1220",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          hover: "var(--primary-hover)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
      },
      keyframes: {
        "float-y": {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, var(--float-amp, -15px), 0)" },
        },
        "drift-a": {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(40px, 30px, 0)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translate3d(0, 10px, 0)" },
          to: { opacity: "1", transform: "none" },
        },
        "drift-b": {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(-40px, 30px, 0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s cubic-bezier(0.23, 1, 0.32, 1) backwards",
        float: "float-y var(--float-dur, 5s) ease-in-out var(--float-delay, 0s) infinite",
        "drift-a": "drift-a 16s ease-in-out infinite",
        "drift-b": "drift-b 19s ease-in-out infinite",
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
