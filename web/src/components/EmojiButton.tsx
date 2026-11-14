"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

// Bibliothèque d'emoji pour les champs libres seulement (pòs, konbit,
// messages et réponses), jamais pour les données de compte.
// emoji-picker-element : chargé seulement à l'ouverture ; données en français
// (recherche) depuis jsdelivr, gardées ensuite dans le navigateur.
const DATA_SOURCE =
  "https://cdn.jsdelivr.net/npm/emoji-picker-element-data@1.8.0/fr/emojibase/data.json";

// Insère l'emoji à la position du curseur du champ (et pas seulement à la fin).
export function useEmojiInsert(
  ref: RefObject<HTMLTextAreaElement | HTMLInputElement | null>,
  value: string,
  setValue: (next: string) => void,
  max?: number,
) {
  return useCallback(
    (emoji: string) => {
      const el = ref.current;
      const start = el?.selectionStart ?? value.length;
      const end = el?.selectionEnd ?? value.length;
      const next = value.slice(0, start) + emoji + value.slice(end);
      if (max && next.length > max) return;
      setValue(next);
      // Curseur juste après l'emoji, champ toujours actif.
      requestAnimationFrame(() => {
        if (!el) return;
        el.focus();
        el.setSelectionRange(start + emoji.length, start + emoji.length);
      });
    },
    [ref, value, setValue, max],
  );
}

export default function EmojiButton({
  onPick,
  placement = "up",
  className = "",
}: {
  onPick: (emoji: string) => void;
  // Ouverture au-dessus (barre d'outils en bas) ou en dessous du bouton.
  placement?: "up" | "down";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const onPickRef = useRef(onPick);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  // Création du sélecteur à l'ouverture.
  useEffect(() => {
    if (!open) return;
    let picker: HTMLElement | null = null;
    let cancelled = false;
    void Promise.all([
      import("emoji-picker-element"),
      import("emoji-picker-element/i18n/fr"),
    ]).then(([{ Picker }, { default: fr }]) => {
      if (cancelled || !holder.current) return;
      const p = new Picker({ locale: "fr", dataSource: DATA_SOURCE, i18n: fr });
      p.classList.add(
        document.documentElement.classList.contains("dark") ? "dark" : "light",
      );
      p.addEventListener("emoji-click", (e) => {
        const unicode = e.detail.unicode;
        if (unicode) onPickRef.current(unicode);
      });
      holder.current.appendChild(p);
      picker = p;
    });
    const close = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      cancelled = true;
      picker?.remove();
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={wrap} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Emoji"
        aria-expanded={open}
        title="Emoji"
        className="flex h-10 w-10 items-center justify-center rounded-full text-brand/80 hover:bg-blue-50 hover:text-brand"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[22px] w-[22px]"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" x2="9.01" y1="9" y2="9" />
          <line x1="15" x2="15.01" y1="9" y2="9" />
        </svg>
      </button>
      {open && (
        <div
          ref={holder}
          className={`absolute left-0 z-40 overflow-hidden rounded-2xl border border-stone-200 shadow-xl ${
            placement === "up" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        />
      )}
    </div>
  );
}
