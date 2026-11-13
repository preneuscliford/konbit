import { Share } from "react-native";
import type { Language, Translate } from "./i18n";
import type { Konbit } from "./konbits";
import { formatKonbitRange } from "./konbitTime";

// Partage vers les autres plateformes (WhatsApp, Facebook, SMS…) avec un lien
// web konbit509.app : il s'ouvre partout, même sans l'app, et affiche un
// aperçu (titre, image). C'est la publicité gratuite de Konbit 509.
export const SITE_URL = "https://konbit509.app";

export const konbitLink = (id: number) => `${SITE_URL}/k/${id}`;
export const businessLink = (slug: string) => `${SITE_URL}/b/${slug}`;
export const profileLink = (pseudo: string) => `${SITE_URL}/u/${pseudo}`;

const excerpt = (text: string, max = 140) => {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

async function share(message: string) {
  await Share.share({ message }).catch(() => {});
}

// Konbit : nom, dates et appel à rejoindre ; pòs : début du texte.
export function shareKonbit(k: Konbit, t: Translate, language: Language) {
  const link = konbitLink(k.id);
  if (k.kind === "konbit" && k.title) {
    const when = k.starts_at && k.ends_at ? `\n🗓 ${formatKonbitRange(k.starts_at, k.ends_at, language)}` : "";
    return share(`${t("App.share.konbit", { title: k.title })}${when}\n${link}`);
  }
  return share(`${excerpt(k.body)}\n\n${t("App.share.post")}\n${link}`);
}

export function shareBusiness(name: string, slug: string, t: Translate) {
  return share(`${t("App.share.business", { name })}\n${businessLink(slug)}`);
}
