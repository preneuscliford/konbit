"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "@/components/Icons";
import { readTheme, saveTheme, THEME_KEY, type ThemeChoice } from "./theme";

// Choix du thème : un clic ouvre un petit menu Klè / Nwa / Otomatik.
const OPTIONS: {
  value: ThemeChoice;
  label: string;
  hint?: string;
  Icon: typeof SunIcon;
}[] = [
  { value: "light", label: "Klè", Icon: SunIcon },
  { value: "dark", label: "Nwa", Icon: MoonIcon },
  {
    value: "system",
    label: "Otomatik",
    hint: "Menm jan ak aparèy ou",
    Icon: MonitorIcon,
  },
];

const CHANGE_EVENT = "konbit-theme-change";

function subscribe(callback: () => void) {
  const onStorage = (e: StorageEvent) => e.key === THEME_KEY && callback();
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

export default function ThemeToggle({
  withLabel = false,
  placement = "down",
  className = "",
}: {
  withLabel?: boolean;
  // up : en bas de la barre latérale, le menu s'ouvre vers le haut.
  placement?: "down" | "up";
  className?: string;
}) {
  const choice = useSyncExternalStore(
    subscribe,
    readTheme,
    () => "system" as ThemeChoice,
  );
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = OPTIONS.find((o) => o.value === choice) ?? OPTIONS[2];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  function pick(value: ThemeChoice) {
    saveTheme(value);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Tèm: ${current.label}. Chwazi yon tèm.`}
        title="Chwazi tèm nan"
        className={`flex items-center gap-4 rounded-full text-stone-700 hover:bg-stone-100 ${className}`}
      >
        <current.Icon className="h-[22px] w-[22px]" strokeWidth={1.9} />
        {withLabel && (
          <span className="hidden text-[15px] font-medium xl:inline">
            Tèm: {current.label}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Tèm"
          className={`absolute z-50 w-60 overflow-hidden rounded-2xl border border-stone-200 bg-surface py-1 shadow-xl ${
            placement === "up"
              ? "bottom-full left-0 mb-2"
              : "right-0 top-full mt-2"
          }`}
        >
          <p className="px-4 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-stone-500">
            Tèm
          </p>
          {OPTIONS.map(({ value, label, hint, Icon }) => {
            const selected = value === choice;
            return (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => pick(value)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-stone-50 ${
                  selected ? "text-brand" : "text-stone-800"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.9} />
                <span className="flex-1">
                  <span className="block text-[15px] font-semibold">
                    {label}
                  </span>
                  {hint && (
                    <span className="block text-xs text-stone-500">{hint}</span>
                  )}
                </span>
                {selected && (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden
                  >
                    <path
                      d="M20 6 9 17l-5-5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
