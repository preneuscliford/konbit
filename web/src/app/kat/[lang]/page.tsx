import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ConflictExplorer from "@/components/conflict/ConflictExplorer";
import { conflictMetadata } from "@/lib/conflict/metadata";

// Carte du conflit en français (/kat/fr) et en anglais (/kat/en).

const OTHER_LANGS = ["fr", "en"] as const;
type OtherLang = (typeof OTHER_LANGS)[number];

function isOtherLang(v: string): v is OtherLang {
  return (OTHER_LANGS as readonly string[]).includes(v);
}

export function generateStaticParams() {
  return OTHER_LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/kat/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  return isOtherLang(lang) ? conflictMetadata(lang) : {};
}

export default async function ConflictMapLangPage({ params }: PageProps<"/kat/[lang]">) {
  const { lang } = await params;
  if (!isOtherLang(lang)) notFound();
  return <ConflictExplorer lang={lang} />;
}
