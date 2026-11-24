import { PERIODS, TIMELINE, type Period, type TimelineEvent, type Zone } from "./data";
import type { Lang } from "./i18n";

// État de la carte à une date donnée (curseur de la frise) : pour chaque
// commune, le dernier statut documenté par la presse à cette date.

export type DatedZone = Zone & { asOf: string };

/** Date d'effet d'une zone. */
export function effectiveDate(zone: Zone, period: Period) {
  return zone.since ?? period.defaultSince;
}

const cache = new Map<string, DatedZone[]>();

/** Zones connues à la date `date` (AAAA-MM-JJ), la plus récente par commune.
 * Résultat mis en cache : même date → même tableau (la carte ne se redessine pas). */
export function stateAt(date: string): DatedZone[] {
  const hit = cache.get(date);
  if (hit) return hit;
  const latest = new Map<string, DatedZone>();
  for (const period of PERIODS) {
    for (const zone of period.zones) {
      const asOf = normalize(effectiveDate(zone, period));
      if (asOf > date) continue;
      const known = latest.get(zone.pcode);
      if (!known || asOf >= known.asOf) latest.set(zone.pcode, { ...zone, asOf });
    }
  }
  const result = [...latest.values()];
  cache.set(date, result);
  return result;
}

/** Première date documentée d'une période (sa zone la plus ancienne). */
function periodStart(p: Period) {
  const dates = p.zones.map((z) => normalize(effectiveDate(z, p)));
  return dates.length ? dates.sort()[0] : normalize(p.defaultSince);
}

/** Période en cours à une date : la plus récente qui a déjà commencé. */
export function periodAt(date: string): Period {
  let current = PERIODS[0];
  for (const p of PERIODS) if (periodStart(p) <= date) current = p;
  return current;
}

const EVENTS_BY_DATE = [...TIMELINE].sort((a, b) => normalize(a.sortKey).localeCompare(normalize(b.sortKey)));

/** Dernier événement survenu à la date `date` (portion de frise où se trouve le curseur). */
export function latestEventAt(date: string): TimelineEvent | undefined {
  let found: TimelineEvent | undefined;
  for (const e of EVENTS_BY_DATE) {
    if (normalize(e.sortKey) > date) break;
    found = e;
  }
  return found;
}

/** Dates « étapes » du curseur : chaque événement et chaque changement de zone. */
export function stepDates(): string[] {
  const dates = new Set<string>();
  for (const e of TIMELINE) dates.add(normalize(e.sortKey));
  for (const p of PERIODS) for (const z of p.zones) dates.add(normalize(effectiveDate(z, p)));
  return [...dates].sort();
}

/** AAAA, AAAA-MM ou AAAA-MM-JJ → AAAA-MM-JJ (milieu de mois si le jour manque). */
export function normalize(d: string) {
  const [y, m = "06", day = "15"] = d.split("-");
  return `${y}-${m.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

const MONTHS: Record<Lang, string[]> = {
  ht: ["janvye", "fevriye", "mas", "avril", "me", "jen", "jiyè", "out", "septanm", "oktòb", "novanm", "desanm"],
  fr: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

/** « mars 2025 » dans la langue choisie. */
export function formatMonth(date: string, lang: Lang) {
  const [y, m] = normalize(date).split("-");
  return `${MONTHS[lang][Number(m) - 1]} ${y}`;
}
