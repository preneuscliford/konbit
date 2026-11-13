/**
 * Konbit 509 Design System - Color Palette
 *
 * Primary: Bleu Konbit 509 (#00209F)
 * Secondary: Rouge Konbit 509 (#D21034)
 * Surface: Warm whites for backgrounds
 * Charcoal: Dark tones for text
 *
 * Deux palettes (claire et sombre) avec les mêmes noms : la bonne est
 * choisie au démarrage selon le thème (lib/theme.ts). Le mode sombre suit le
 * site (fond noir façon « Lights out » de X, bleu et rouge éclaircis).
 */
import { IS_DARK } from "@/lib/theme";

const light = {
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
  // Texte sur un fond de couleur (boutons bleus, bannières) : blanc dans les deux thèmes.
  textInverse: "#FFFFFF",

  // Bordures et séparateurs
  border: "#E5E7EB",
  borderSoft: "#EEEEE8",
  borderStrong: "#D1D5DB",

  // Semantic
  error: "#EF4444",
  success: "#22C55E",
  warning: "#F59E0B",
  info: "#3B82F6",

  // Encadrés d'alerte (fond + texte)
  warningBg: "#FEF3C7",
  warningBgSoft: "#FFFBEB",
  warningText: "#92400E",
  dangerBg: "#FEE2E2",
  dangerBgSoft: "#FEF2F2",
  dangerText: "#991B1B",
  successBg: "#DCFCE7",
  successText: "#15803D",

  // Effet de pression (ripple Android) sur les surfaces
  ripple: "rgba(0,0,0,0.06)",

  // Tab bar
  tabBarBackground: "#FFFFFF",
  tabBarBorder: "#F0F0EB",
  tabIconDefault: "#9CA3AF",
  tabIconActive: "#00209F",
};

const dark: typeof light = {
  primary: "#4D74FF",
  primaryLight: "#7A97FF",
  primaryDark: "#3A5BD9",
  primary50: "#0D1A3A",
  primary100: "#16285A",

  secondary: "#F0354F",
  secondaryLight: "#F56A7E",
  secondaryDark: "#C42A40",

  surface: "#16181C",
  surfaceWarm: "#000000",
  surfaceMuted: "#0B0C0E",

  text: "#E7E9EA",
  textLight: "#C4C7CA",
  textMuted: "#8B9096",
  textInverse: "#FFFFFF",

  border: "#2F3336",
  borderSoft: "#24272A",
  borderStrong: "#3E4144",

  error: "#F87171",
  success: "#34D399",
  warning: "#FBBF24",
  info: "#60A5FA",

  warningBg: "#3A2A05",
  warningBgSoft: "#241A04",
  warningText: "#FCD34D",
  dangerBg: "#3A0F16",
  dangerBgSoft: "#24090E",
  dangerText: "#FCA5A5",
  successBg: "#0B2A1F",
  successText: "#6EE7B7",

  ripple: "rgba(255,255,255,0.08)",

  tabBarBackground: "#000000",
  tabBarBorder: "#2F3336",
  tabIconDefault: "#71767B",
  tabIconActive: "#4D74FF",
};

const palette = IS_DARK ? dark : light;

const Colors = {
  ...palette,
  isDark: IS_DARK,
  // Style de la barre d'état (heure, batterie) selon le thème.
  statusBar: (IS_DARK ? "light" : "dark") as "light" | "dark",

  // Legacy compatibility
  light: {
    text: light.text,
    background: light.surfaceWarm,
    tint: light.primary,
    tabIconDefault: light.tabIconDefault,
    tabIconSelected: light.primary,
  },
  dark: {
    text: dark.text,
    background: dark.surfaceWarm,
    tint: dark.primary,
    tabIconDefault: dark.tabIconDefault,
    tabIconSelected: dark.primary,
  },
};

export default Colors;
