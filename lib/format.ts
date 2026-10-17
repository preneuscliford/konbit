// Nombres à la française (virgule décimale, espace pour les milliers), comme
// sur haitiscope.com — aussi en kreyòl, qui suit l'usage français. Fait à la
// main pour ne pas dépendre du support Intl du moteur JavaScript.
export function formatNumber(value: number, maxDecimals = 2): string {
  const fixed = value.toFixed(maxDecimals).replace(/\.?0+$/, "");
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
