import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  Wind,
  type LucideIcon,
} from "lucide-react-native";

// Icône et dégradé selon le ciel, partagés par l'Accueil et l'écran Météo.

export function weatherIcon(condition: string, isDay = true): LucideIcon {
  switch (condition) {
    case "clear":
      return isDay ? Sun : Moon;
    case "partly-cloudy":
      return isDay ? CloudSun : CloudMoon;
    case "cloudy":
      return Cloud;
    case "fog":
      return CloudFog;
    case "wind":
      return Wind;
    case "rain":
      return CloudRain;
    case "showers":
      return CloudDrizzle;
    case "thunderstorm":
      return CloudLightning;
    case "snow":
      return CloudSnow;
    default:
      return isDay ? CloudSun : CloudMoon;
  }
}

export function weatherGradient(condition: string, isDay = true): [string, string] {
  if (!isDay) return ["#0B1238", "#1E2A6E"];
  switch (condition) {
    case "clear":
      return ["#0EA5E9", "#38BDF8"];
    case "partly-cloudy":
      return ["#0284C7", "#60A5FA"];
    case "rain":
    case "showers":
      return ["#334155", "#64748B"];
    case "thunderstorm":
      return ["#1E293B", "#475569"];
    case "cloudy":
    case "fog":
      return ["#64748B", "#94A3B8"];
    default:
      return ["#0369A1", "#38BDF8"];
  }
}
