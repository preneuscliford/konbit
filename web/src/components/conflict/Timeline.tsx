"use client";

import { useEffect, useRef, useState } from "react";
import { PERIODS, TIMELINE, eventKey, type TimelineEvent } from "@/lib/conflict/data";
import { formatMonth, normalize, stepDates } from "@/lib/conflict/state";
import { useLang } from "./lang";
import { KIND_DOT } from "./Panel";

// Frise-curseur (façon DeepState) : on la parcourt (glisser, clic, ▶) et la
// carte montre l'état documenté à cette date. Chaque point est un événement.

const START = 2018;
const END = 2027;
const STEPS = stepDates();

function position(date: string) {
  const [y, m, d] = normalize(date).split("-").map(Number);
  const t = y + (m - 1) / 12 + (d - 1) / 365;
  return Math.min(100, Math.max(0, ((t - START) / (END - START)) * 100));
}

function dateAt(pct: number) {
  const t = START + (Math.min(100, Math.max(0, pct)) / 100) * (END - START);
  const y = Math.floor(t);
  const m = Math.min(12, Math.floor((t - y) * 12) + 1);
  const d = Math.min(28, Math.floor(((t - y) * 12 - (m - 1)) * 28) + 1);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

type Props = {
  cursor: string;
  activeEvent: string | null;
  onCursor: (date: string) => void;
  onEvent: (e: TimelineEvent) => void;
};

export default function Timeline({ cursor, activeEvent, onCursor, onEvent }: Props) {
  const { lang, tr, t } = useLang();
  const track = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const years = Array.from({ length: END - START }, (_, i) => START + i);
  const latest = useRef(cursor);
  useEffect(() => {
    latest.current = cursor;
  });

  // Lecture : avance d'étape en étape (événements et changements de zones).
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const next = STEPS.find((d) => d > latest.current);
      if (!next) {
        setPlaying(false);
        return;
      }
      onCursor(next);
    }, 1100);
    return () => window.clearInterval(id);
  }, [playing, onCursor]);

  function fromPointer(clientX: number) {
    const box = track.current?.getBoundingClientRect();
    if (!box) return;
    onCursor(dateAt(((clientX - box.left) / box.width) * 100));
  }

  const pos = position(cursor);

  return (
    <div className="flex select-none items-center gap-3 px-3 pb-2 pt-3 sm:px-4">
      <button
        onClick={() => {
          if (!playing && cursor >= STEPS[STEPS.length - 1]) onCursor(STEPS[0]);
          setPlaying((p) => !p);
        }}
        aria-label={playing ? t("pause") : t("play")}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-stone-900 text-sm text-surface shadow"
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <div className="w-[76px] shrink-0 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">{t("situationAt")}</p>
        <p className="text-sm font-extrabold capitalize text-stone-900">{formatMonth(cursor, lang)}</p>
      </div>
      <div
        ref={track}
        className="relative h-14 min-w-0 flex-1 cursor-pointer touch-none"
        onPointerDown={(e) => {
          setPlaying(false);
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e.clientX);
        }}
      >
        {/* Axe : parcouru / à venir */}
        <div className="absolute inset-x-0 top-7 h-1 rounded bg-stone-200" />
        <div className="absolute left-0 top-7 h-1 rounded bg-stone-500" style={{ width: `${pos}%` }} />
        {years.map((y) => (
          <div
            key={y}
            className={`pointer-events-none absolute top-9 -translate-x-1/2 text-[10px] font-semibold text-stone-400 ${y % 2 ? "max-sm:hidden" : ""}`}
            style={{ left: `${position(String(y) + "-01-01")}%` }}
          >
            <div className="mx-auto mb-0.5 h-1.5 w-px bg-stone-300" />
            {y}
          </div>
        ))}
        {/* Événements */}
        {TIMELINE.map((e) => {
          const k = eventKey(e);
          const past = normalize(e.sortKey) <= cursor;
          return (
            <button
              key={k}
              title={`${tr(e.date)} — ${tr(e.title)}`}
              aria-label={`${tr(e.date)}: ${tr(e.title)}`}
              onPointerDown={(ev) => ev.stopPropagation()}
              onClick={() => {
                setPlaying(false);
                onCursor(normalize(e.sortKey));
                onEvent(e);
              }}
              className={`absolute top-[23px] size-3 -translate-x-1/2 rounded-full ring-2 ring-surface transition hover:scale-150 ${KIND_DOT[e.kind]} ${
                past ? "" : "opacity-35"
              } ${activeEvent === k ? "scale-150 outline-2 outline-offset-2 outline-stone-900" : ""}`}
              style={{ left: `${position(e.sortKey)}%` }}
            />
          );
        })}
        {/* Curseur */}
        <div className="pointer-events-none absolute top-3 h-8 w-0.5 -translate-x-1/2 rounded bg-stone-900" style={{ left: `${pos}%` }}>
          <span className="absolute -top-1 left-1/2 size-3 -translate-x-1/2 rounded-full border-2 border-surface bg-stone-900 shadow" />
        </div>
        {/* Raccourcis de période */}
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onPointerDown={(ev) => ev.stopPropagation()}
            onClick={() => {
              setPlaying(false);
              onCursor(`${p.id}-12-31`);
            }}
            className="absolute -top-1 hidden -translate-x-1/2 rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-stone-500 ring-1 ring-stone-300 hover:text-stone-900 sm:block"
            style={{ left: `${position(`${p.id}-12-31`)}%` }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
