import { PERIODS, TIMELINE, type Period, type TimelineEvent, type ZoneStatus } from "./data";

// Évolution entre deux périodes, commune par commune.
// Une zone absente de la période la plus récente n'est PAS une amélioration :
// c'est une donnée manquante (aucun article de presse pour cette période).

export type Change = "worse" | "new" | "better" | "same" | "nodata";

export type ZoneChange = { pcode: string; from?: ZoneStatus; to?: ZoneStatus; change: Change };

/** Gravité pour la population : contrôle > combats > influence > incertain. */
const SEVERITY: Record<ZoneStatus, number> = { unclear: 1, influence: 2, contested: 3, control: 4 };

export function previousPeriod(period: Period): Period | undefined {
  const i = PERIODS.findIndex((p) => p.id === period.id);
  return i > 0 ? PERIODS[i - 1] : undefined;
}

export function compare(prev: Period, cur: Period): ZoneChange[] {
  const before = new Map(prev.zones.map((z) => [z.pcode, z.status]));
  const after = new Map(cur.zones.map((z) => [z.pcode, z.status]));
  const pcodes = new Set([...before.keys(), ...after.keys()]);
  return [...pcodes].map((pcode) => {
    const from = before.get(pcode);
    const to = after.get(pcode);
    let change: Change;
    // « À clarifier » n'est pas une mesure : on ne compare pas.
    if (!to || to === "unclear" || from === "unclear") change = "nodata";
    else if (!from) change = "new";
    else if (SEVERITY[to] > SEVERITY[from]) change = "worse";
    else if (SEVERITY[to] < SEVERITY[from]) change = "better";
    else change = "same";
    return { pcode, from, to, change };
  });
}

/** Événements d'une période : depuis la fin de la précédente jusqu'à sa propre fin. */
export function eventsBetween(prev: Period | undefined, cur: Period): TimelineEvent[] {
  const start = prev ? `${Number(prev.id) + 1}` : "0000";
  const end = `${cur.id}-99`;
  return TIMELINE.filter((e) => e.sortKey >= start && e.sortKey <= end).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}
