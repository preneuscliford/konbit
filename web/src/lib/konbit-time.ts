// Dates des konbits : saisies et affichées à l'heure d'Haïti, pour que la
// diaspora voie la même heure que les gens sur place.
export const HAITI_TZ = "America/Port-au-Prince";

const DAYS = [
  "dimanch",
  "lendi",
  "madi",
  "mèkredi",
  "jedi",
  "vandredi",
  "samdi",
];
const MONTHS = [
  "janvye",
  "fevriye",
  "mas",
  "avril",
  "me",
  "jen",
  "jiyè",
  "out",
  "septanm",
  "oktòb",
  "novanm",
  "desanm",
];

type Parts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

const PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: HAITI_TZ,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  weekday: "short",
  hourCycle: "h23",
});
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function haitiParts(date: Date): Parts {
  const p = Object.fromEntries(
    PARTS.formatToParts(date).map((x) => [x.type, x.value]),
  );
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
    weekday: WEEKDAY_INDEX[p.weekday as string] ?? 0,
  };
}

// « 2026-11-15 » + « 08:00 » (heure d'Haïti) → date UTC.
export function haitiToDate(date: string, time = "08:00"): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Écart entre l'heure d'Haïti et UTC à ce moment-là (heure d'été comprise).
  const p = haitiParts(new Date(guess));
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return new Date(guess - (asUtc - guess));
}

// Aujourd'hui en Haïti, au format des champs date (« 2026-11-12 »).
export function haitiToday(offsetDays = 0): string {
  const p = haitiParts(new Date(Date.now() + offsetDays * 86_400_000));
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

const time = (p: Parts) =>
  p.minute ? `${p.hour}è${String(p.minute).padStart(2, "0")}` : `${p.hour}è`;

// « samdi 15 novanm, 8è »
export function formatKonbitDate(iso: string, withTime = true): string {
  const p = haitiParts(new Date(iso));
  const day = `${DAYS[p.weekday]} ${p.day} ${MONTHS[p.month - 1]}`;
  return withTime ? `${day}, ${time(p)}` : day;
}

// « samdi 15 novanm, 8è → dimanch 16 novanm » (date de fin sans heure si
// c'est la fin de journée ; jour seul si tout se passe le même jour).
export function formatKonbitRange(startIso: string, endIso: string): string {
  const s = haitiParts(new Date(startIso));
  const e = haitiParts(new Date(endIso));
  const sameDay = s.year === e.year && s.month === e.month && s.day === e.day;
  if (sameDay) return `${formatKonbitDate(startIso)} → ${time(e)}`;
  const endOfDay = e.hour === 23 && e.minute === 59;
  return `${formatKonbitDate(startIso)} → ${formatKonbitDate(endIso, !endOfDay)}`;
}

export type KonbitStatus = "upcoming" | "ongoing" | "ended";

export function konbitStatus(
  startIso: string,
  endIso: string,
  now = Date.now(),
): KonbitStatus {
  if (now < new Date(startIso).getTime()) return "upcoming";
  if (now < new Date(endIso).getTime()) return "ongoing";
  return "ended";
}

export const STATUS_LABEL: Record<KonbitStatus, string> = {
  upcoming: "Ap vini",
  ongoing: "An kou",
  ended: "Fini",
};
