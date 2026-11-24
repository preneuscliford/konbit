// Copie le worker de MapLibre dans public/ (carte du conflit, /kat).
// MapLibre 6 charge son worker à côté de son propre fichier
// (import.meta.url), ce que Turbopack ne fournit pas : on le sert donc
// nous-mêmes, à la même version que le paquet installé.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve("maplibre-gl/package.json"));
const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "maplibre");

mkdirSync(outDir, { recursive: true });
copyFileSync(join(pkgDir, "dist", "maplibre-gl-worker.mjs"), join(outDir, "maplibre-gl-worker.mjs"));
