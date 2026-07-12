/**
 * Konbit Design System - Color Palette
 *
 * Primary: Teal-green (warm, caribbean feel)
 * Secondary: Orange-coral (energy, accent)
 * Surface: Warm whites for backgrounds
 * Charcoal: Dark tones for text
 */

const Colors = {
  // Primary palette
  primary: "#0D9488",
  primaryLight: "#14B8A6",
  primaryDark: "#0F766E",
  primary50: "#F0FDFA",
  primary100: "#CCFBF1",

  // Secondary palette
  secondary: "#F97316",
  secondaryLight: "#FB923C",
  secondaryDark: "#EA580C",

  // Surface palette
  surface: "#FFFFFF",
  surfaceWarm: "#FAFAF5",
  surfaceMuted: "#F5F5F0",

  // Text palette
  text: "#1A1A2E",
  textLight: "#2D2D44",
  textMuted: "#6B7280",
  textInverse: "#FFFFFF",

  // Semantic
  error: "#EF4444",
  success: "#22C55E",
  warning: "#F59E0B",
  info: "#3B82F6",

  // Tab bar
  tabBarBackground: "#FFFFFF",
  tabBarBorder: "#F0F0EB",
  tabIconDefault: "#9CA3AF",
  tabIconActive: "#0D9488",

  // Legacy compatibility
  light: {
    text: "#1A1A2E",
    background: "#FAFAF5",
    tint: "#0D9488",
    tabIconDefault: "#9CA3AF",
    tabIconSelected: "#0D9488",
  },
  dark: {
    text: "#F5F5F0",
    background: "#1A1A2E",
    tint: "#14B8A6",
    tabIconDefault: "#6B7280",
    tabIconSelected: "#14B8A6",
  },
};

export default Colors;