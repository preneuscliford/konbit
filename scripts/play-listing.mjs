// Met à jour la fiche Google Play de Konbit 509 depuis le dossier store/ :
//   store/details.json                         langue par défaut, e-mail, site
//   store/listing/<langue>/title.txt           titre (30 caractères max)
//   store/listing/<langue>/short_description.txt   (80 max)
//   store/listing/<langue>/full_description.txt    (4000 max)
//   store/images/<langue>/phoneScreenshots/*.png   captures (2 à 8), dans l'ordre des noms
//   store/images/<langue>/featureGraphic.png       1024 x 500
//   store/images/<langue>/icon.png                 512 x 512
// Une image absente pour une langue est prise dans store/images/common/.
//
// Clé : le compte de service Google Play (le même que pour eas submit, avec en
// plus l'autorisation « Gérer la présence sur le Play Store »). Le fichier reste
// HORS du dépôt ; son chemin est donné par PLAY_KEY.
//
//   $env:PLAY_KEY = "C:\Users\prene\keys\konbit-play-service-account.json"
//   node scripts/play-listing.mjs            # aperçu : n'envoie rien
//   node scripts/play-listing.mjs --apply    # envoie textes + images
//   node scripts/play-listing.mjs --apply --text-only
//   node scripts/play-listing.mjs --apply --screenshots-only   # captures seulement
//
// La politique de confidentialité se règle dans « Contenu de l'appli » du Play
// Console : l'API ne permet pas de la modifier.

import { createReadStream, existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { androidpublisher, auth } from "@googleapis/androidpublisher";

const PACKAGE = "com.cliford.konbit";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STORE = join(ROOT, "store");
const LIMITS = { title: 30, shortDescription: 80, fullDescription: 4000 };
const apply = process.argv.includes("--apply");
const textOnly = process.argv.includes("--text-only");
// Captures seulement : ne touche ni aux textes, ni aux détails, ni à la bannière, ni à l'icône.
const screenshotsOnly = process.argv.includes("--screenshots-only");

const read = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n").trim();

function listings() {
  const dir = join(STORE, "listing");
  return readdirSync(dir).map((language) => {
    const listing = {
      title: read(join(dir, language, "title.txt")),
      shortDescription: read(join(dir, language, "short_description.txt")),
      fullDescription: read(join(dir, language, "full_description.txt")),
    };
    for (const [key, max] of Object.entries(LIMITS)) {
      if (listing[key].length > max)
        throw new Error(`${language}/${key} : ${listing[key].length} caractères (max ${max})`);
    }
    return { language, listing };
  });
}

function imagesFor(language) {
  const pick = (name) =>
    [join(STORE, "images", language, name), join(STORE, "images", "common", name)].find(existsSync);
  const shotsDir = pick("phoneScreenshots");
  return {
    phoneScreenshots: shotsDir
      ? readdirSync(shotsDir).filter((f) => f.endsWith(".png")).sort().map((f) => join(shotsDir, f))
      : [],
    featureGraphic: [pick("featureGraphic.png")].filter(Boolean),
    icon: [pick("icon.png")].filter(Boolean),
  };
}

const details = JSON.parse(readFileSync(join(STORE, "details.json"), "utf8"));
const all = listings();

console.log(`Fiche Play de ${PACKAGE}${apply ? "" : " (aperçu, rien n'est envoyé)"}`);
console.log(`  Détails : ${JSON.stringify(details)}`);
for (const { language, listing } of all) {
  console.log(`  ${language} : « ${listing.title} » — ${listing.shortDescription.length}/80, ${listing.fullDescription.length}/4000`);
  if (!textOnly) {
    const imgs = imagesFor(language);
    console.log(
      screenshotsOnly
        ? `    images : ${imgs.phoneScreenshots.length} captures (textes, bannière et icône inchangés)`
        : `    images : ${imgs.phoneScreenshots.length} captures, ${imgs.featureGraphic.length ? "bannière" : "pas de bannière"}, ${imgs.icon.length ? "icône" : "pas d'icône"}`,
    );
  }
}
if (!apply) {
  console.log("\nRelance avec --apply pour envoyer.");
  process.exit(0);
}

const keyFile = process.env.PLAY_KEY;
if (!keyFile || !existsSync(keyFile)) throw new Error("PLAY_KEY doit donner le chemin du fichier JSON de la clé.");
if (resolve(keyFile).toLowerCase().startsWith(ROOT.toLowerCase()))
  throw new Error("La clé ne doit pas être dans le dossier du projet : déplace-la ailleurs.");

const client = new auth.GoogleAuth({
  keyFile,
  scopes: ["https://www.googleapis.com/auth/androidpublisher"],
});
const api = androidpublisher({ version: "v3", auth: client });

// Une « edit » regroupe tous les changements, appliqués ensemble à la fin.
const { data: edit } = await api.edits.insert({ packageName: PACKAGE });
const editId = edit.id;
try {
  if (!screenshotsOnly) await api.edits.details.patch({ packageName: PACKAGE, editId, requestBody: details });
  // En mode captures seulement, on ne crée pas de nouvelle langue : on se limite
  // aux fiches qui existent déjà sur le Play Store.
  const live = screenshotsOnly
    ? new Set(((await api.edits.listings.list({ packageName: PACKAGE, editId })).data.listings ?? []).map((l) => l.language))
    : null;
  for (const { language, listing } of all) {
    if (live && !live.has(language)) {
      console.log(`- ${language} : pas de fiche sur le Play Store, ignorée`);
      continue;
    }
    if (!screenshotsOnly) {
      await api.edits.listings.update({ packageName: PACKAGE, editId, language, requestBody: listing });
      console.log(`✓ textes ${language}`);
    }
    if (textOnly) continue;
    for (const [imageType, files] of Object.entries(imagesFor(language))) {
      if (files.length === 0) continue;
      if (screenshotsOnly && imageType !== "phoneScreenshots") continue;
      await api.edits.images.deleteall({ packageName: PACKAGE, editId, language, imageType });
      for (const file of files) {
        await api.edits.images.upload({
          packageName: PACKAGE,
          editId,
          language,
          imageType,
          media: { mimeType: "image/png", body: createReadStream(file) },
        });
      }
      console.log(`✓ ${imageType} ${language} (${files.length})`);
    }
  }
  await api.edits.commit({ packageName: PACKAGE, editId });
  console.log("\nFiche envoyée. Elle apparaît après l'examen de Google (souvent quelques heures).");
} catch (e) {
  await api.edits.delete({ packageName: PACKAGE, editId }).catch(() => {});
  throw e;
}
