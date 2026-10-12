/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Palette Konbit 509 (bleu #00209F, rouge #D21034)
        primary: {
          DEFAULT: "#00209F",
          light: "#3350C4",
          dark: "#001A80",
          50: "#EEF1FB",
          100: "#D4DBF5",
          500: "#00209F",
          600: "#001A80",
          700: "#00145F",
        },
        secondary: {
          DEFAULT: "#D21034",
          light: "#E54563",
          dark: "#A80D2A",
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
        "emerald-green": "#00209F",
        "mango-orange": "#D21034",
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
        float: "0px 8px 24px rgba(0, 32, 159, 0.15)",
      },
    },
  },
  plugins: [],
};
