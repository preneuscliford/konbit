/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Palette Konbit
        primary: {
          DEFAULT: "#0D9488",
          light: "#14B8A6",
          dark: "#0F766E",
          50: "#F0FDFA",
          100: "#CCFBF1",
          500: "#0D9488",
          600: "#0F766E",
          700: "#115E59",
        },
        secondary: {
          DEFAULT: "#F97316",
          light: "#FB923C",
          dark: "#EA580C",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          warm: "#FAFAF5",
          muted: "#F5F5F0",
        },
        charcoal: {
          DEFAULT: "#1A1A2E",
          light: "#2D2D44",
          muted: "#6B7280",
        },
        // Legacy aliases for existing code
        "ghost-white": "#FAFAF5",
        "rich-black": "#1A1A2E",
        "emerald-green": "#0D9488",
        "mango-orange": "#F97316",
      },
      fontFamily: {
        sans: ["System"],
        mono: ["SpaceMono"],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
      boxShadow: {
        card: "0px 2px 8px rgba(0, 0, 0, 0.06)",
        "card-lg": "0px 4px 16px rgba(0, 0, 0, 0.08)",
        float: "0px 8px 24px rgba(13, 148, 136, 0.15)",
      },
    },
  },
  plugins: [],
};
