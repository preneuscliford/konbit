import type { Metadata } from "next";
import ConflictExplorer from "@/components/conflict/ConflictExplorer";
import { conflictMetadata } from "@/lib/conflict/metadata";

// Carte du conflit en Haïti, plein écran, en kreyòl (langue par défaut du
// site). Français et anglais : /kat/fr et /kat/en.

export const metadata: Metadata = conflictMetadata("ht");

export default function ConflictMapPage() {
  return <ConflictExplorer lang="ht" />;
}
