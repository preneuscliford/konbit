/**
 * Konbit 509 Design System - Color Palette
 *
 * Primary: Bleu Konbit 509 (#00209F)
 * Secondary: Rouge Konbit 509 (#D21034)
 * Surface: Warm whites for backgrounds
 * Charcoal: Dark tones for text
 */

const Colors = {
  // Primary palette
  primary: "#00209F",
  primaryLight: "#3350C4",
  primaryDark: "#001A80",
  primary50: "#EEF1FB",
  primary100: "#D4DBF5",

  // Secondary palette
  secondary: "#D21034",
  secondaryLight: "#E54563",
  secondaryDark: "#A80D2A",

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
  tabIconActive: "#00209F",

  // Legacy compatibility
  light: {
    text: "#1A1A2E",
    background: "#FAFAF5",
    tint: "#00209F",
    tabIconDefault: "#9CA3AF",
    tabIconSelected: "#00209F",
  },
  dark: {
    text: "#F5F5F0",
    background: "#1A1A2E",
    tint: "#3350C4",
    tabIconDefault: "#6B7280",
    tabIconSelected: "#3350C4",
  },
};

export default Colors;