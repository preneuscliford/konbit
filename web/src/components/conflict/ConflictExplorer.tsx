"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { LAST_UPDATED, eventKey, type TimelineEvent } from "@/lib/conflict/data";
import { LANGS, LANG_NAME, LANG_PATH, t as translate, type Lang, type UIKey } from "@/lib/conflict/i18n";
import { LangProvider } from "./lang";
import { compare, previousPeriod } from "@/lib/conflict/changes";
import { latestEventAt, periodAt, stateAt, stepDates } from "@/lib/conflict/state";
import { useGeo } from "./geo";
import MapView, { HAITI_BOUNDS, type Focus } from "./MapView";
import Panel, { type Detail, type Tab } from "./Panel";
import Timeline from "./Timeline";
import type { Theme } from "./theme";

// Carte du conflit plein écran (inspirée de DeepState) : carte détaillée,
// panneau latéral repliable (ordinateur) ou tiroir (téléphone), frise en bas.
// Un clic sur une zone ouvre directement sa fiche.

function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setTheme(el.classList.contains("dark") ? "dark" : "light");
    read();
    const obs = new MutationObserver(read);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

function useDesktop() {
  // Lu dès le premier rendu côté navigateur : la carte est créée avec la
  // bonne marge (pas de panneau latéral sur téléphone).
  const [desktop, setDesktop] = useState(
    () => typeof window === "undefined" || window.matchMedia("(min-width: 1024px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const read = () => setDesktop(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  return desktop;
}

const PANEL_W = 384;

// Avertissement fermé par le visiteur (mémorisé dans son navigateur).
const WARNING_KEY = "kat-warning-ok";
const WARNING_EVENT = "kat-warning";
function readWarning() {
  try {
    return localStorage.getItem(WARNING_KEY) === "1";
  } catch {
    return false;
  }
}
function subscribeWarning(onChange: () => void) {
  window.addEventListener(WARNING_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(WARNING_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export default function ConflictExplorer({ lang }: { lang: Lang }) {
  const t = (key: UIKey, vars?: Record<string, string | number>) => translate(lang, key, vars);
  const theme = useTheme();
  const desktop = useDesktop();
  const { geo, error } = useGeo();

  // Date du curseur de la frise (par défaut : la dernière étape connue).
  const [cursor, setCursor] = useState(() => stepDates().at(-1)!);
  const [tab, setTab] = useState<Tab>("overview");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [mode, setMode] = useState<"status" | "change">("status");
  // Avertissement : affiché tant que le visiteur ne l'a pas fermé (mémorisé
  // dans son navigateur, sans conséquence si le stockage est bloqué).
  const warned = useSyncExternalStore(subscribeWarning, readWarning, () => true);
  const dismissWarning = () => {
    try {
      localStorage.setItem(WARNING_KEY, "1");
    } catch {}
    window.dispatchEvent(new Event(WARNING_EVENT));
  };

  const period = periodAt(cursor);
  const zones = stateAt(cursor);
  const prev = previousPeriod(period);
  // Mode « Évolution » : changements par rapport à la période précédente.
  const changes = useMemo(() => (mode === "change" && prev ? compare(prev, period) : null), [mode, prev, period]);

  const modeToggle = (
    <div role="radiogroup" aria-label={t("modeChange")} className="flex shrink-0 rounded-full bg-stone-100 p-0.5 text-xs font-bold shadow-sm">
      {(["status", "change"] as const).map((m) => (
        <button
          key={m}
          role="radio"
          aria-checked={mode === m}
          onClick={() => {
            setMode(m);
            setTab("overview");
            setDetail(null);
            setPanelOpen(true);
            setSheetOpen(true);
          }}
          className={`rounded-full px-3 py-1 ${mode === m ? "bg-surface text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"}`}
        >
          {t(m === "status" ? "modeStatus" : "modeChange")}
        </button>
      ))}
    </div>
  );

  const highlighted = useMemo(
    () => (detail?.kind === "group" ? zones.filter((z) => z.groups.includes(detail.id)).map((z) => z.pcode) : []),
    [detail, zones],
  );
  const selected = detail?.kind === "zone" ? detail.pcode : null;

  const reveal = useCallback(() => {
    setPanelOpen(true);
    setSheetOpen(true);
  }, []);

  const focusOn = useCallback(
    (pcode: string) => {
      const b = geo?.places.get(pcode)?.bounds;
      if (b) setFocus({ bounds: b, nonce: Date.now() });
    },
    [geo],
  );

  const onMapSelect = useCallback(
    (pcode: string | null) => {
      if (!pcode) {
        if (detail?.kind === "zone") setDetail(null);
        return;
      }
      setDetail({ kind: "zone", pcode });
      reveal();
    },
    [detail, reveal],
  );

  const onZone = useCallback(
    (pcode: string) => {
      setDetail({ kind: "zone", pcode });
      focusOn(pcode);
      reveal();
    },
    [focusOn, reveal],
  );

  const onEvent = useCallback(
    (e: TimelineEvent) => {
      setDetail({ kind: "event", key: eventKey(e) });
      if (e.pcode) focusOn(e.pcode);
      reveal();
    },
    [focusOn, reveal],
  );

  // En parcourant la frise, le panneau montre l'événement de la portion où
  // se trouve le curseur (sans avoir à cliquer sur le point).
  const onScrub = useCallback((date: string) => {
    setCursor(date);
    const e = latestEventAt(date);
    setDetail(e ? { kind: "event", key: eventKey(e) } : null);
    setPanelOpen(true);
  }, []);

  const panel = geo && (
    <Panel
      theme={theme}
      period={period}
      zones={zones}
      cursor={cursor}
      mode={mode}
      changes={changes}
      places={geo.places}
      tab={tab}
      detail={detail}
      onTab={setTab}
      onDetail={setDetail}
      onZone={onZone}
      onEvent={onEvent}
    />
  );

  return (
    <LangProvider value={lang}>
    <div lang={lang} className="fixed inset-0 flex flex-col bg-page">
      {/* Barre du haut */}
      <header className="z-20 flex h-14 shrink-0 items-center gap-3 border-b border-stone-200 bg-surface px-3 sm:px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Konbit 509">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={30} height={28} className="h-7 w-[30px] object-contain" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-extrabold text-stone-900 sm:text-base">{t("title")}</h1>
          <p className="truncate text-[11px] text-stone-500">
            {t("updated", { date: LAST_UPDATED[lang] })} · {t("pressBased")}
          </p>
        </div>
        <button
          onClick={() => {
            setDetail(null);
            setFocus({ bounds: HAITI_BOUNDS, nonce: Date.now() });
          }}
          className="hidden rounded-full border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-brand sm:inline-block"
        >
          {t("wholeCountry")}
        </button>
        <nav aria-label={t("language")} className="flex rounded-full bg-stone-100 p-0.5 text-xs font-bold">
          {LANGS.map((l) => (
            <Link
              key={l}
              href={LANG_PATH[l]}
              hrefLang={l}
              title={LANG_NAME[l]}
              aria-current={l === lang ? "page" : undefined}
              className={`rounded-full px-2.5 py-1 uppercase ${l === lang ? "bg-surface text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"}`}
            >
              {l}
            </Link>
          ))}
        </nav>
        <ThemeToggle className="p-2" />
      </header>

      {!warned && (
        <div role="note" className="z-20 flex shrink-0 items-start gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          <span aria-hidden className="mt-0.5 text-base">⚠️</span>
          <p className="flex-1 text-xs leading-relaxed sm:text-sm">
            <strong>{t("warningTitle")} · </strong>
            {t("warning")}
          </p>
          <button
            onClick={dismissWarning}
            className="shrink-0 rounded-full bg-amber-900 px-3 py-1 text-xs font-bold text-white hover:bg-amber-800 dark:bg-amber-200 dark:text-amber-950"
          >
            {t("warningOk")}
          </button>
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        {geo ? (
          <div className="absolute inset-0">
            <MapView
              geo={geo}
              theme={theme}
              zones={zones}
              changes={changes}
              selected={selected}
              highlighted={highlighted}
              focus={focus}
              padLeft={desktop && panelOpen ? PANEL_W + 12 : 0}
              padBottom={desktop ? 90 : sheetOpen ? 360 : 200}
              onSelect={onMapSelect}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-stone-500">
            {error ? t("loadError") : t("loading")}
          </div>
        )}

        {geo && desktop && (
          <>
            {/* Panneau latéral */}
            {panelOpen ? (
              <aside
                className="absolute bottom-3 left-3 top-3 z-10 flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-surface shadow-xl"
                style={{ width: PANEL_W }}
              >
                <div className="min-h-0 flex-1">{panel}</div>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="border-t border-stone-200 py-2 text-xs font-semibold text-stone-500 hover:text-stone-900"
                >
                  {t("hidePanel")}
                </button>
              </aside>
            ) : (
              <button
                onClick={() => setPanelOpen(true)}
                className="absolute left-3 top-3 z-10 rounded-full border border-stone-200 bg-surface px-4 py-2 text-sm font-semibold text-stone-800 shadow-lg"
              >
                {t("details")}
              </button>
            )}
            {/* Situation / Évolution */}
            <div className="absolute top-3 z-10" style={{ left: panelOpen ? PANEL_W + 24 : 140 }}>
              {modeToggle}
            </div>
            {/* Frise */}
            <div
              className="absolute bottom-3 z-10 rounded-2xl border border-stone-200 bg-surface/95 shadow-xl backdrop-blur"
              style={{ left: panelOpen ? PANEL_W + 24 : 12, right: 260 }}
            >
              <Timeline
                cursor={cursor}
                activeEvent={detail?.kind === "event" ? detail.key : null}
                onCursor={onScrub}
                onEvent={onEvent}
              />
            </div>
          </>
        )}

        {geo && !desktop && (
          <div
            className="absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-2xl border-t border-stone-200 bg-surface shadow-[0_-8px_30px_rgba(0,0,0,0.15)] transition-[height] duration-300"
            style={{ height: sheetOpen ? "66dvh" : 196 }}
          >
            <button
              onClick={() => setSheetOpen((o) => !o)}
              aria-label={sheetOpen ? t("collapse") : t("expand")}
              className="flex shrink-0 justify-center pb-1 pt-2"
            >
              <span className="h-1.5 w-10 rounded-full bg-stone-300" />
            </button>
            <div className="flex shrink-0 justify-center px-4">{modeToggle}</div>
            <div className="shrink-0">
              <Timeline
                cursor={cursor}
                activeEvent={detail?.kind === "event" ? detail.key : null}
                onCursor={onScrub}
                onEvent={onEvent}
              />
            </div>
            <div className="min-h-0 flex-1" onClick={() => !sheetOpen && setSheetOpen(true)}>
              {panel}
            </div>
          </div>
        )}
      </div>
    </div>
    </LangProvider>
  );
}
