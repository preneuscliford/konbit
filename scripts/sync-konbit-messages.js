// Recopie les textes du site HaitiScope (source de vérité, déjà traduits) dans
// i18n/{ht,fr}.json : Konbit (signalement), Home (taux du dollar),
// CurrencyConverter, RateCheckTool, CommunitySignalForm, Weather. Le namespace
// "App" (textes propres à l'app mobile) n'est pas touché.
// Usage : node scripts/sync-konbit-messages.js [chemin du repo haitiScope]
const fs = require("fs");
const path = require("path");

const NAMESPACES = ["Konbit", "Home", "CurrencyConverter", "RateCheckTool", "CommunitySignalForm", "Weather"];
const haitiScope = process.argv[2] || path.join(__dirname, "..", "..", "haitiScope");

for (const lang of ["ht", "fr"]) {
  const source = JSON.parse(fs.readFileSync(path.join(haitiScope, "web", "messages", `${lang}.json`), "utf8"));
  const target = path.join(__dirname, "..", "i18n", `${lang}.json`);
  const current = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, "utf8")) : {};
  for (const ns of NAMESPACES) {
    if (!source[ns]) throw new Error(`Namespace ${ns} absent de ${lang}.json`);
    current[ns] = source[ns];
  }
  fs.writeFileSync(target, JSON.stringify(current, null, 2) + "\n");
  console.log(`${lang}: ${NAMESPACES.join(", ")} copiés`);
}
