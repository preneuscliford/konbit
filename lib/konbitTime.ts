import type { Language } from "./i18n";

// Dates des konbits : saisies et affichées à l'heure d'Haïti (comme le site),
// pour que la diaspora voie la même heure que les gens sur place.
// Calcul fait ici (règles d'heure d'été des États-Unis, suivies par Haïti)
// plutôt qu'avec Intl, dont le support des fuseaux varie selon les téléphones.

// n-ième dimanche du mois (mois 0-11), en UTC.
function nthSunday(year: number, month: number, n: number): number {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return 1 + ((7 - first) % 7) + (n - 1) * 7;
}

// Écart avec UTC en heures : -4 (heure d'été, 2e dimanche de mars → 1er
// dimanche de novembre, à 2 h locales) ou -5.
function haitiOffset(utcMs: number): number {
  const year = new Date(utcMs).getUTCFullYear();
  const start = Date.UTC(year, 2, nthSunday(year, 2, 2), 7); // 2 h EST = 7 h UTC
  const end = Date.UTC(year, 10, nthSunday(year, 10, 1), 6); // 2 h EDT = 6 h UTC
  return utcMs >= start && utcMs < end ? -4 : -5;
}

type Parts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };

function haitiParts(date: Date): Parts {
  const local = new Date(date.getTime() + haitiOffset(date.getTime()) * 3_600_000);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth(),
    day: local.getUTCDate(),
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
    weekday: local.getUTCDay(),
  };
}

// Jour + heure choisis (heure d'Haïti) → date réelle (UTC).
export function haitiToDate(year: number, month: number, day: number, hour: number, minute: number): Date {
  const guess = Date.UTC(year, month, day, hour, minute);
  return new Date(guess - haitiOffset(guess + 5 * 3_600_000) * 3_600_000);
}

// Fin d'une journée en Haïti (23 h 59).
export function endOfHaitiDay(date: Date): Date {
  const p = haitiParts(date);
  return haitiToDate(p.year, p.month, p.day, 23, 59);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

// Date « demain 8 h » en Haïti : valeur de départ du formulaire.
export function defaultStart(now: number): Date {
  const p = haitiParts(new Date(now + 86_400_000));
  return haitiToDate(p.year, p.month, p.day, 8, 0);
}

// Pour les sélecteurs de date du téléphone (qui travaillent en heure locale) :
// une date « affichable » dont les chiffres locaux = l'heure d'Haïti.
export function toPickerDate(date: Date): Date {
  const p = haitiParts(date);
  return new Date(p.year, p.month, p.day, p.hour, p.minute);
}

export function fromPickerDate(picked: Date): Date {
  return haitiToDate(picked.getFullYear(), picked.getMonth(), picked.getDate(), picked.getHours(), picked.getMinutes());
}

const NAMES: Record<Language, { days: string[]; months: string[] }> = {
  ht: {
    days: ["dimanch", "lendi", "madi", "mèkredi", "jedi", "vandredi", "samdi"],
    months: ["janvye", "fevriye", "mas", "avril", "me", "jen", "jiyè", "out", "septanm", "oktòb", "novanm", "desanm"],
  },
  fr: {
    days: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
    months: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  },
};

const time = (p: Parts, language: Language) => {
  const mm = String(p.minute).padStart(2, "0");
  if (language === "fr") return `${p.hour}h${p.minute ? mm : ""}`;
  return p.minute ? `${p.hour}è${mm}` : `${p.hour}è`;
};

// « samdi 15 novanm, 8è »
export function formatKonbitDate(iso: string, language: Language, withTime = true): string {
  const p = haitiParts(new Date(iso));
  const n = NAMES[language] ?? NAMES.ht;
  const day = `${n.days[p.weekday]} ${p.day} ${n.months[p.month]}`;
  return withTime ? `${day}, ${time(p, language)}` : day;
}

// « samdi 15 novanm, 8è → dimanch 16 novanm »
export function formatKonbitRange(startIso: string, endIso: string, language: Language): string {
  const s = haitiParts(new Date(startIso));
  const e = haitiParts(new Date(endIso));
  if (s.year === e.year && s.month === e.month && s.day === e.day) {
    return `${formatKonbitDate(startIso, language)} → ${time(e, language)}`;
  }
  const endOfDay = e.hour === 23 && e.minute === 59;
  return `${formatKonbitDate(startIso, language)} → ${formatKonbitDate(endIso, language, !endOfDay)}`;
}

export type KonbitStatus = "upcoming" | "ongoing" | "ended";

export function konbitStatus(startIso: string, endIso: string, now: number): KonbitStatus {
  if (now < new Date(startIso).getTime()) return "upcoming";
  if (now < new Date(endIso).getTime()) return "ongoing";
  return "ended";
}
