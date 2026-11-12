import type { MetadataRoute } from "next";
import {
  getBusinessSlugs,
  getRecentKonbits,
  getRecentPseudos,
} from "@/lib/data";
import { SITE_URL } from "@/lib/site";

// Plan du site pour Google : accueil, konbits récents, fiches business, profils.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [konbits, pseudos, businesses] = await Promise.all([
    getRecentKonbits(50),
    getRecentPseudos(500),
    getBusinessSlugs(500),
  ]);
  return [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/konbit`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/biznis`, changeFrequency: "daily", priority: 0.9 },
    ...["kondisyon", "konfidansyalite", "sekirite-timoun"].map((p) => ({
      url: `${SITE_URL}/${p}`,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
    ...businesses.map((b) => ({
      url: `${SITE_URL}/b/${b.slug}`,
      lastModified: b.updated_at,
      priority: 0.8,
    })),
    ...konbits.map((k) => ({
      url: `${SITE_URL}/k/${k.id}`,
      lastModified: k.created_at,
      priority: 0.7,
    })),
    ...pseudos.map((p) => ({ url: `${SITE_URL}/u/${p}`, priority: 0.6 })),
  ];
}
