"use client";

import {
  BOUNDARIES_SOURCE,
  GROUPS,
  IMPACT,
  LAST_UPDATED,
  PERIODS,
  SOURCE_KINDS,
  STATUS_ORDER,
  TIMELINE,
  confirmationLevel,
  eventKey,
  groupById,
  type Period,
  type Source,
  type SourceKind,
  type TimelineEvent,
  type ZoneStatus,
} from "@/lib/conflict/data";
import type { UIKey } from "@/lib/conflict/i18n";
import { formatMonth, type DatedZone } from "@/lib/conflict/state";
import { eventsBetween, previousPeriod, type Change, type ZoneChange } from "@/lib/conflict/changes";
import type { Place } from "./geo";
import { useLang } from "./lang";
import { CHANGE_COLORS, PALETTE, type Theme } from "./theme";

export type Tab = "overview" | "groups" | "timeline" | "about";
export type Detail = { kind: "zone"; pcode: string } | { kind: "group"; id: string } | { kind: "event"; key: string };

const TABS: { id: Tab; label: UIKey }[] = [
  { id: "overview", label: "tabOverview" },
  { id: "groups", label: "tabGroups" },
  { id: "timeline", label: "tabTimeline" },
  { id: "about", label: "tabAbout" },
];

export const KIND_DOT = {
  violence: "bg-brand-red",
  politics: "bg-stone-500",
  international: "bg-brand",
  security: "bg-emerald-600",
} as const;

type Props = {
  theme: Theme;
  period: Period;
  /** Zones documentées à la date du curseur. */
  zones: DatedZone[];
  cursor: string;
  mode: "status" | "change";
  changes: ZoneChange[] | null;
  places: Map<string, Place>;
  tab: Tab;
  detail: Detail | null;
  onTab: (t: Tab) => void;
  onDetail: (d: Detail | null) => void;
  onZone: (pcode: string) => void;
  onEvent: (e: TimelineEvent) => void;
};

export default function Panel(props: Props) {
  const { tab, detail, onTab, onDetail } = props;
  const { t } = useLang();
  return (
    <div className="flex h-full min-h-0 flex-col">
      {detail ? (
        <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-2.5">
          <button
            onClick={() => onDetail(null)}
            className="rounded-full px-2 py-1 text-sm font-semibold text-brand hover:bg-stone-100"
          >
            {t("back")}
          </button>
        </div>
      ) : (
        <nav role="tablist" className="flex gap-1 overflow-x-auto border-b border-stone-200 px-2 pt-2">
          {TABS.map((x) => (
            <button
              key={x.id}
              role="tab"
              aria-selected={x.id === tab}
              onClick={() => onTab(x.id)}
              className={`shrink-0 border-b-2 px-3 pb-2 text-sm font-semibold transition ${
                x.id === tab ? "border-brand text-stone-900" : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              {t(x.label)}
            </button>
          ))}
        </nav>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {detail?.kind === "zone" && <ZoneDetail {...props} pcode={detail.pcode} />}
        {detail?.kind === "group" && <GroupDetail {...props} id={detail.id} />}
        {detail?.kind === "event" && <EventDetail {...props} eventKeyValue={detail.key} />}
        {!detail && tab === "overview" && (props.mode === "change" ? <ChangeOverview {...props} /> : <Overview {...props} />)}
        {!detail && tab === "groups" && <GroupList {...props} />}
        {!detail && tab === "timeline" && <EventList {...props} />}
        {!detail && tab === "about" && <About />}
      </div>
    </div>
  );
}

/* ---------- Éléments communs ---------- */

function Swatch({ status, theme }: { status: ZoneStatus; theme: Theme }) {
  const color = PALETTE[theme].status[status];
  return (
    <span
      className="inline-block size-3.5 shrink-0 rounded-[3px] border"
      style={
        status === "contested"
          ? { borderColor: color, background: `repeating-linear-gradient(135deg, ${color} 0 2px, transparent 2px 5px)` }
          : { borderColor: color, background: color }
      }
    />
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-500">{children}</p>;
}

const KIND_LABEL: Record<SourceKind, UIKey> = {
  "press-ht": "kindPressHt",
  "press-intl": "kindPressIntl",
  "press-indep": "kindPressIndep",
  police: "kindPolice",
};

/** Sources d'une zone, presse d'abord, avec le niveau de confirmation. */
function Sources({ sources, verified, showLevel = true }: { sources: Source[]; verified: boolean; showLevel?: boolean }) {
  const { t, tr } = useLang();
  const sorted = [...sources].sort((a, b) => SOURCE_KINDS.indexOf(a.kind) - SOURCE_KINDS.indexOf(b.kind));
  const level = confirmationLevel(sources);
  return (
    <div className="rounded-xl bg-stone-50 p-3">
      {showLevel && (
        <div className="mb-3">
          <Label>{t("confirmation")}</Label>
          <div className="flex items-center gap-2">
            <span className="flex gap-0.5" aria-hidden>
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-2 w-5 rounded-full ${
                    i <= level ? (level >= 3 ? "bg-emerald-600" : level === 2 ? "bg-amber-500" : "bg-brand-red") : "bg-stone-200"
                  }`}
                />
              ))}
            </span>
            <span className="text-xs font-semibold text-stone-700">
              {level <= 1 ? t("confirmed1") : level === 2 ? t("confirmed2") : t("confirmed3", { n: level })}
            </span>
          </div>
        </div>
      )}
      <Label>{t("sources")}</Label>
      <ul className="space-y-1.5 text-xs text-stone-700">
        {sorted.map((s) => (
          <li key={s.label.en}>
            <span className="mr-1.5 inline-block rounded bg-stone-200 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-stone-600">
              {t(KIND_LABEL[s.kind])}
            </span>
            {s.url ? (
              <a href={s.url} className="underline" target="_blank" rel="noreferrer">
                {tr(s.label)}
              </a>
            ) : (
              tr(s.label)
            )}
          </li>
        ))}
      </ul>
      {!verified && <p className="mt-2 text-xs font-semibold text-amber-700">{t("draftSource")}</p>}
    </div>
  );
}

function placeName(places: Map<string, Place>, pcode: string) {
  const p = places.get(pcode);
  if (!p) return pcode;
  return p.level === "section" ? `${p.name} (${p.commune})` : p.name;
}

function EventButton({ e, onEvent }: { e: TimelineEvent; onEvent: (e: TimelineEvent) => void }) {
  const { tr } = useLang();
  return (
    <button onClick={() => onEvent(e)} className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-stone-50">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">{tr(e.date)}</span>
      <span className="block text-sm font-semibold text-stone-900">{tr(e.title)}</span>
    </button>
  );
}

/* ---------- Onglets ---------- */

function Overview({ period, zones, cursor, theme }: Props) {
  const { lang, t, tr, statusLabel, statusHint } = useLang();
  const counts = STATUS_ORDER.map((s) => [s, zones.filter((z) => z.status === s).length] as const);
  const displaced = IMPACT.displaced.at(-1)!;
  const low = IMPACT.capitalControl.at(-1)!;
  const high = IMPACT.capitalControl[0];
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-stone-500">{t("asOf", { date: formatMonth(cursor, lang) })}</p>
        <h2 className="text-2xl font-extrabold capitalize text-stone-900">{formatMonth(cursor, lang)}</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">{tr(period.summary)}</p>
      </div>

      <div>
        <Label>{t("legend")}</Label>
        <ul className="space-y-2">
          {counts.map(([s, n]) => (
            <li key={s} className="flex items-start gap-2.5">
              <Swatch status={s} theme={theme} />
              <div className="-mt-0.5 flex-1">
                <p className="text-sm font-semibold text-stone-900">
                  {statusLabel(s)} <span className="font-normal text-stone-400">· {n}</span>
                </p>
                <p className="text-xs text-stone-500">{statusHint(s)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label={t("displaced")} value={tr(displaced.value)} note={`${tr(displaced.source.label).split(" — ")[0]}, ${tr(displaced.date)}`} />
        <Stat label={t("capital")} value={`${tr(low.value)} – ${tr(high.value)}`} note={t("capitalNote")} />
      </div>

      <p className="text-xs text-stone-500">{t("tapHint")}</p>
    </div>
  );
}

const CHANGE_ORDER: Change[] = ["worse", "new", "better", "same", "nodata"];
const CHANGE_KEYS: Record<Change, [UIKey, UIKey]> = {
  worse: ["changeWorse", "changeHintWorse"],
  new: ["changeNew", "changeHintNew"],
  better: ["changeBetter", "changeHintBetter"],
  same: ["changeSame", "changeHintSame"],
  nodata: ["changeNoData", "changeHintNoData"],
};

/** Mode « Évolution » : bilan des changements et opérations de la période. */
function ChangeOverview({ period, changes, places, theme, onZone, onEvent }: Props) {
  const { t, statusLabel } = useLang();
  const prev = previousPeriod(period);
  if (!prev || !changes) {
    return <p className="text-sm text-stone-600">{t("changeFirst")}</p>;
  }
  const ops = eventsBetween(prev, period).filter((e) => e.kind === "security");
  const colors = CHANGE_COLORS[theme];
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-stone-500">{t("changeVs", { prev: prev.label })}</p>
        <h2 className="text-2xl font-extrabold text-stone-900">
          {prev.label} → {period.label}
        </h2>
      </div>
      {CHANGE_ORDER.map((c) => {
        const list = changes.filter((z) => z.change === c);
        if (!list.length) return null;
        return (
          <div key={c}>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="size-3.5 rounded-[3px]" style={{ background: colors[c] }} />
              <p className="text-sm font-bold text-stone-900">
                {t(CHANGE_KEYS[c][0])} <span className="font-normal text-stone-400">· {list.length}</span>
              </p>
            </div>
            <p className="mb-1.5 text-xs text-stone-500">{t(CHANGE_KEYS[c][1])}</p>
            <ul className="space-y-0.5">
              {list.map((z) => (
                <li key={z.pcode}>
                  <button
                    onClick={() => onZone(z.pcode)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1 text-left text-sm hover:bg-stone-50"
                  >
                    <span className="font-semibold text-stone-900">{placeName(places, z.pcode)}</span>
                    <span className="text-right text-[11px] text-stone-500">
                      {z.from ? statusLabel(z.from) : "—"} → {z.to ? statusLabel(z.to) : "?"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <div>
        <Label>{t("securityOps")}</Label>
        {ops.length ? (
          <ul className="space-y-1">
            {ops.map((e) => (
              <li key={eventKey(e)}>
                <EventButton e={e} onEvent={onEvent} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-500">{t("noSecurityOps")}</p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-stone-200 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-stone-900">{value}</p>
      <p className="text-[11px] text-stone-500">{note}</p>
    </div>
  );
}

function GroupList({ zones, onDetail }: Props) {
  const { t, tr } = useLang();
  return (
    <div className="space-y-2">
      <p className="mb-3 text-xs text-stone-500">{t("groupsIntro")}</p>
      {GROUPS.map((g) => {
        const n = zones.filter((z) => z.groups.includes(g.id)).length;
        return (
          <button
            key={g.id}
            onClick={() => onDetail({ kind: "group", id: g.id })}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-stone-200 px-3 py-2.5 text-left hover:bg-stone-50"
          >
            <span>
              <span className="block text-sm font-bold text-stone-900">{g.name}</span>
              <span className="block text-xs text-stone-500">{tr(g.area)}</span>
            </span>
            <span className="shrink-0 text-xs text-stone-400">{n > 0 ? t("areasCount", { n }) : "—"}</span>
          </button>
        );
      })}
    </div>
  );
}

const KIND_LABEL_EVENT: Record<TimelineEvent["kind"], UIKey> = {
  violence: "kindViolence",
  politics: "kindPolitics",
  international: "kindInternational",
  security: "kindSecurity",
};

function EventList({ onEvent }: Props) {
  const { t } = useLang();
  const events = [...TIMELINE].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  return (
    <>
    <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-stone-600">
      {(Object.keys(KIND_DOT) as TimelineEvent["kind"][]).map((k) => (
        <li key={k} className="flex items-center gap-1.5">
          <span className={`size-2.5 rounded-full ${KIND_DOT[k]}`} />
          {t(KIND_LABEL_EVENT[k])}
        </li>
      ))}
    </ul>
    <ol className="relative space-y-1 border-l-2 border-stone-200 pl-4">
      {events.map((e) => (
        <li key={eventKey(e)} className="relative">
          <span className={`absolute -left-[23px] top-3 size-2.5 rounded-full ring-4 ring-surface ${KIND_DOT[e.kind]}`} />
          <EventButton e={e} onEvent={onEvent} />
        </li>
      ))}
    </ol>
    </>
  );
}

function About() {
  const { t, tr } = useLang();
  return (
    <div className="space-y-4 text-sm text-stone-700">
      <p>
        {t("aboutIntro")} <strong>{t("aboutNotRealtime")}</strong>
      </p>
      <ul className="list-disc space-y-1.5 pl-5">
        {(["rule1", "rule2", "rule3", "rule4", "rule5"] as const).map((k) => (
          <li key={k}>{t(k)}</li>
        ))}
      </ul>
      <p className="text-xs text-stone-500">{t("lastUpdate", { date: tr(LAST_UPDATED) })}</p>
      <div className="space-y-1 text-xs text-stone-500">
        <p>
          <a href={BOUNDARIES_SOURCE.url} className="underline" target="_blank" rel="noreferrer">
            {tr(BOUNDARIES_SOURCE.label)}
          </a>
        </p>
        <p>{t("basemap")}</p>
      </div>
    </div>
  );
}

/* ---------- Fiches ---------- */

function ZoneDetail({ pcode, period, zones, cursor, places, theme, onDetail, onEvent }: Props & { pcode: string }) {
  const { lang, t, tr, statusLabel, statusHint } = useLang();
  const place = places.get(pcode);
  const zone = zones.find((z) => z.pcode === pcode);
  const history = PERIODS.map((p) => ({ p, z: p.zones.find((z) => z.pcode === pcode) }));
  const events = TIMELINE.filter((e) => e.pcode === pcode).sort((a, b) => b.sortKey.localeCompare(a.sortKey));

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
          {place?.level === "section"
            ? t("zoneSection", { commune: place.commune ?? "", dept: place.dept })
            : t("zoneCommune", { dept: place?.dept ?? "" })}
        </p>
        <h2 className="text-2xl font-extrabold text-stone-900">{place?.name ?? pcode}</h2>
      </div>

      {zone ? (
        <>
          <div className="flex items-center gap-2.5 rounded-xl border border-stone-200 p-3">
            <Swatch status={zone.status} theme={theme} />
            <div>
              <p className="text-sm font-bold text-stone-900">{statusLabel(zone.status)}</p>
              <p className="text-xs text-stone-500">{statusHint(zone.status)}</p>
              <p className="mt-1 text-[11px] font-semibold text-stone-600">
                {t("documentedSince", { date: formatMonth(zone.asOf, lang) })}
              </p>
            </div>
          </div>
          {zone.note && <p className="text-sm leading-relaxed text-stone-800">{tr(zone.note)}</p>}
          {zone.groups.length > 0 && (
            <div>
              <Label>{t("armedGroups")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {zone.groups.map((id) => (
                  <button
                    key={id}
                    onClick={() => onDetail({ kind: "group", id })}
                    className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-800 hover:bg-stone-200"
                  >
                    {groupById(id)?.name ?? id}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Sources sources={zone.sources} verified={zone.verified} />
        </>
      ) : (
        <p className="rounded-xl bg-stone-50 p-3 text-sm text-stone-600">{t("zoneNone", { period: formatMonth(cursor, lang) })}</p>
      )}

      <div>
        <Label>{t("overTime")}</Label>
        <ol className="grid grid-cols-3 gap-1.5">
          {history.map(({ p, z }) => (
            <li
              key={p.id}
              className={`rounded-lg border p-2 ${p.id === period.id ? "border-stone-900" : "border-stone-200"}`}
            >
              <p className="text-xs font-bold text-stone-900">{p.label}</p>
              <div className="mt-1 flex items-center gap-1.5">
                {z ? <Swatch status={z.status} theme={theme} /> : <span className="size-3.5 shrink-0 rounded-[3px] border border-stone-300" />}
                <span className="text-[11px] leading-tight text-stone-600">
                  {z ? statusLabel(z.status) : p.zones.length ? t("none") : t("pending")}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {events.length > 0 && (
        <div>
          <Label>{t("eventsHere")}</Label>
          <ul className="space-y-1">
            {events.map((e) => (
              <li key={eventKey(e)}>
                <EventButton e={e} onEvent={onEvent} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GroupDetail({ id, zones, cursor, places, onZone }: Props & { id: string }) {
  const { lang, t, tr, statusLabel } = useLang();
  const g = groupById(id);
  if (!g) return null;
  const areas = zones.filter((z) => z.groups.includes(id));
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
          {g.kind === "coalition" ? t("coalition") : t("armedGroup")}
        </p>
        <h2 className="text-2xl font-extrabold text-stone-900">{g.name}</h2>
        <p className="mt-1 text-sm text-stone-600">{tr(g.area)}</p>
      </div>
      {g.leader && (
        <div className="rounded-xl border border-stone-200 p-3">
          <Label>{t("leader")}</Label>
          <p className="text-sm font-semibold text-stone-900">
            {g.leader.name}
            {g.leader.role && <span className="font-normal text-stone-500"> ({tr(g.leader.role)})</span>}
          </p>
          <p className="mt-1 text-xs text-stone-500">{t("namedIn")}</p>
          <ul className="mt-0.5 space-y-0.5 text-xs">
            {g.leader.sources.map((s) => (
              <li key={s.label.en}>
                <a href={s.url} className="text-stone-600 underline" target="_blank" rel="noreferrer">
                  {tr(s.label)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {g.designations.length > 0 && (
        <ul className="space-y-1">
          {g.designations.map((d) => (
            <li key={d.en} className="text-xs font-semibold text-brand-red">
              {tr(d)}
            </li>
          ))}
        </ul>
      )}
      <div>
        <Label>{t("howOperates")}</Label>
        <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">
          {g.modusOperandi.map((m) => (
            <li key={m.en}>{tr(m)}</li>
          ))}
        </ul>
      </div>
      <div>
        <Label>{t("areasIn", { period: formatMonth(cursor, lang) })}</Label>
        {areas.length ? (
          <ul className="space-y-1">
            {areas.map((z) => (
              <li key={z.pcode}>
                <button
                  onClick={() => onZone(z.pcode)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-stone-50"
                >
                  <span className="font-semibold text-stone-900">{placeName(places, z.pcode)}</span>
                  <span className="text-right text-xs text-stone-500">{statusLabel(z.status)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-500">{t("noArea")}</p>
        )}
      </div>
      <Sources sources={g.sources} verified={g.verified} />
    </div>
  );
}

function EventDetail({ eventKeyValue, places, onZone }: Props & { eventKeyValue: string }) {
  const { t, tr } = useLang();
  const e = TIMELINE.find((x) => eventKey(x) === eventKeyValue);
  if (!e) return null;
  return (
    <div className="space-y-4">
      <div>
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-stone-500">
          <span className={`size-2.5 rounded-full ${KIND_DOT[e.kind]}`} />
          {tr(e.date)}
        </p>
        <h2 className="mt-1 text-xl font-extrabold text-stone-900">{tr(e.title)}</h2>
      </div>
      {e.pcode && (
        <button
          onClick={() => onZone(e.pcode!)}
          className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-200"
        >
          {t("eventCommune", { name: placeName(places, e.pcode) })}
        </button>
      )}
      <Sources sources={[e.source]} verified={e.verified} showLevel={false} />
    </div>
  );
}
