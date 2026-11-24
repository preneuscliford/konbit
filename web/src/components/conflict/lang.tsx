"use client";

import { createContext, useContext } from "react";
import type { ZoneStatus } from "@/lib/conflict/data";
import { t as translate, type L, type Lang, type UIKey } from "@/lib/conflict/i18n";

// Langue de la carte, fournie une fois par ConflictExplorer.

const LangContext = createContext<Lang>("ht");

export const LangProvider = LangContext.Provider;

const STATUS_KEYS: Record<ZoneStatus, [UIKey, UIKey]> = {
  control: ["statusControl", "hintControl"],
  influence: ["statusInfluence", "hintInfluence"],
  contested: ["statusContested", "hintContested"],
  unclear: ["statusUnclear", "hintUnclear"],
};

export function useLang() {
  const lang = useContext(LangContext);
  return {
    lang,
    t: (key: UIKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
    tr: (text: L) => text[lang],
    statusLabel: (s: ZoneStatus) => translate(lang, STATUS_KEYS[s][0]),
    statusHint: (s: ZoneStatus) => translate(lang, STATUS_KEYS[s][1]),
  };
}
