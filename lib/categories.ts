import {
  Car,
  CloudSun,
  Crosshair,
  DollarSign,
  Droplet,
  Flame,
  Fuel,
  Megaphone,
  Shield,
  Siren,
  TrafficCone,
  WifiOff,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import type { KonbitCategory, KonbitModule } from "./api";

// Même découpage que le formulaire web (konbit-report-form.tsx).
export const INFO_CATEGORIES = ["rate-snapshot", "weather-snapshot"];

export const UTILITY_CATEGORIES = [
  "fuel-shortage",
  "fuel-available",
  "power-outage",
  "power-restored",
  "water-outage",
  "water-available",
];

// Pas de catégorie "explosion" : décision produit délibérée.
export const SECURITY_CATEGORIES = [
  "gunfire",
  "police-operation",
  "armed-clash",
  "road-blocked",
  "road-reopened",
  "major-fire",
  "power-cut",
  "water-cut",
  "network-down",
];

const SECURITY_SET = new Set(SECURITY_CATEGORIES);
const INFO_SET = new Set(INFO_CATEGORIES);

// La couleur dit l'état, pas le thème : rouge = problème, vert = rétabli,
// bleu = info du jour, ambre = opération policière (une présence n'est pas en
// soi un problème).
export type Tone = "problem" | "ok" | "info" | "police";

export const TONE_COLOR: Record<Tone, string> = {
  problem: "#D21034",
  ok: "#15803D",
  info: "#0284C7",
  police: "#D97706",
};

interface CategoryMeta {
  emoji: string;
  Icon: LucideIcon;
  tone: Tone;
}

const META: Record<string, CategoryMeta> = {
  "fuel-shortage": { emoji: "⛽", Icon: Fuel, tone: "problem" },
  "fuel-available": { emoji: "⛽", Icon: Fuel, tone: "ok" },
  "power-outage": { emoji: "⚡", Icon: Zap, tone: "problem" },
  "power-restored": { emoji: "⚡", Icon: Zap, tone: "ok" },
  "water-outage": { emoji: "💧", Icon: Droplet, tone: "problem" },
  "water-available": { emoji: "💧", Icon: Droplet, tone: "ok" },
  "rate-snapshot": { emoji: "💵", Icon: DollarSign, tone: "info" },
  "weather-snapshot": { emoji: "🌤️", Icon: CloudSun, tone: "info" },
  gunfire: { emoji: "🔫", Icon: Crosshair, tone: "problem" },
  "police-operation": { emoji: "🚔", Icon: Shield, tone: "police" },
  "armed-clash": { emoji: "⚠️", Icon: Siren, tone: "problem" },
  "road-blocked": { emoji: "🚧", Icon: TrafficCone, tone: "problem" },
  "road-reopened": { emoji: "🛣️", Icon: Car, tone: "ok" },
  "major-fire": { emoji: "🔥", Icon: Flame, tone: "problem" },
  "power-cut": { emoji: "⚡", Icon: Zap, tone: "problem" },
  "water-cut": { emoji: "💧", Icon: Droplet, tone: "problem" },
  "network-down": { emoji: "📡", Icon: WifiOff, tone: "problem" },
};

// Une catégorie ajoutée plus tard côté serveur s'affiche de façon générique
// au lieu de faire planter le rendu d'une ancienne version de l'app.
const UNKNOWN: CategoryMeta = { emoji: "📢", Icon: Megaphone, tone: "info" };

export function categoryMeta(category: KonbitCategory): CategoryMeta {
  return META[category] ?? UNKNOWN;
}

export function isKnownCategory(category: KonbitCategory): boolean {
  return category in META;
}

export function moduleOf(category: KonbitCategory): KonbitModule {
  return SECURITY_SET.has(category) ? "security" : "utility";
}

export function isInfoCategory(category: KonbitCategory): boolean {
  return INFO_SET.has(category);
}
