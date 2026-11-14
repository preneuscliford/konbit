// Nombres à la française (virgule décimale, espace pour les milliers), comme
// sur haitiscope.com — aussi en kreyòl, qui suit l'usage français. Fait à la
// main pour ne pas dépendre du support Intl du moteur JavaScript.
export function formatNumber(value: number, maxDecimals = 2): string {
  // Zéros inutiles retirés seulement après la virgule : sans décimales
  // (maxDecimals = 0), « 14200 » doit rester 14 200 et pas devenir « 142 ».
  const raw = value.toFixed(maxDecimals);
  const fixed = raw.includes(".") ? raw.replace(/\.?0+$/, "") : raw;
  const [int, dec] = fixed.split(".");
  const sign = int.startsWith("-") ? "-" : "";
  const digits = sign ? int.slice(1) : int;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${grouped}${dec ? `,${dec}` : ""}`;
}

// "16/10" ou "13:05" à partir d'un horodatage, en heure du téléphone.
export function formatShortDate(t: number): string {
  const d = new Date(t);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatShortTime(t: number): string {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
