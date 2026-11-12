import { BellIcon, HomeIcon, StoreIcon, UserIcon } from "@/components/Icons";

// Entrées de navigation de l'espace Konbit (barre latérale et onglets mobiles).
export type NavKey = "feed" | "business" | "notifications" | "profile";

export const NAV = [
  { key: "feed", label: "Konbit yo", Icon: HomeIcon },
  { key: "business", label: "Biznis", Icon: StoreIcon },
  { key: "notifications", label: "Notifikasyon", Icon: BellIcon },
  { key: "profile", label: "Pwofil", Icon: UserIcon },
] as const;

export const COMPOSE_HREF = "/lanse";

// Lien de chaque entrée selon le compte (profil : sa page, ou la connexion).
export function navHref(
  key: NavKey,
  pseudo: string | null | undefined,
): string {
  if (key === "feed") return "/konbit";
  if (key === "business") return "/biznis";
  if (key === "notifications")
    return pseudo ? "/notifikasyon" : "/konekte?next=%2Fnotifikasyon";
  return pseudo ? `/u/${pseudo}` : "/konekte";
}

export function isActive(
  key: NavKey,
  pathname: string,
  pseudo: string | null | undefined,
): boolean {
  if (key === "business")
    return pathname.startsWith("/biznis") || pathname.startsWith("/b/");
  if (key === "feed")
    return pathname === "/konbit" || pathname.startsWith("/k/");
  if (key === "notifications") return pathname === "/notifikasyon";
  return !!pseudo && pathname.toLowerCase() === `/u/${pseudo.toLowerCase()}`;
}
