import { readFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import { cacheLife } from "next/cache";

// Textes légaux de Konbit 509, rédigés en Markdown dans content/legal/.
// Convertis en HTML sur le serveur : aucune bibliothèque envoyée au navigateur.
export type LegalDoc = "kondisyon" | "konfidansyalite" | "sekirite-timoun";

export async function getLegalHtml(
  doc: LegalDoc,
): Promise<{ title: string; updated: string; html: string }> {
  "use cache";
  cacheLife("days");
  const markdown = await readFile(
    path.join(process.cwd(), "content", "legal", `${doc}.md`),
    "utf8",
  );
  const title = markdown.match(/^# (.+)$/m)?.[1]?.trim() ?? "Konbit 509";
  const updated =
    markdown.match(/Dernière mise à jour : ([^*\n]+)/)?.[1]?.trim() ?? "";
  // Le titre est affiché par la page : on ne le rend pas deux fois.
  const html = await marked.parse(markdown.replace(/^# .+\n/m, ""), {
    gfm: true,
  });
  return { title, updated, html };
}
