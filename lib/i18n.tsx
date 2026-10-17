import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import ht from "@/i18n/ht.json";
import fr from "@/i18n/fr.json";
import { ApiError } from "./api";
import { isKnownCategory } from "./categories";

// Kreyòl par défaut (décision produit), français en option dans les réglages.
// Le namespace "Konbit" est copié du site HaitiScope (scripts/sync-konbit-messages.js),
// "App" contient les textes propres à l'app mobile.
export type Language = "ht" | "fr";
export const LANGUAGES: { code: Language; label: string }[] = [
  { code: "ht", label: "Kreyòl" },
  { code: "fr", label: "Français" },
];

const MESSAGES: Record<Language, unknown> = { ht, fr };
const STORAGE_KEY = "konbit-language";

type Params = Record<string, string | number>;
export type Translate = (key: string, params?: Params) => string;

function lookup(messages: unknown, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>(
    (node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined),
    messages,
  );
  return typeof value === "string" ? value : undefined;
}

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  ready: boolean;
  t: Translate;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ht");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === "ht" || saved === "fr") setLanguageState(saved);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const t = useCallback<Translate>(
    (key, params) => {
      // Repli sur le français si une clé manque en kreyòl, puis sur la clé elle-même.
      const text = lookup(MESSAGES[language], key) ?? lookup(MESSAGES.fr, key) ?? key;
      if (!params) return text;
      return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
    },
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, ready, t }), [language, setLanguage, ready, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n doit être utilisé dans <I18nProvider>");
  return value;
}

export function categoryLabel(t: Translate, category: string): string {
  return isKnownCategory(category) ? t(`Konbit.category.${category}`) : t("App.unknownCategory");
}

const RELATIVE: Record<Language, { now: string; min: string; h: string; d: string }> = {
  ht: { now: "kounye a", min: "sa gen {n} min", h: "sa gen {n} è", d: "sa gen {n} j" },
  fr: { now: "à l'instant", min: "il y a {n} min", h: "il y a {n} h", d: "il y a {n} j" },
};

// Même découpage que formatRelative() sur le web.
export function formatRelative(iso: string, language: Language): string {
  const text = RELATIVE[language];
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return text.now;
  if (minutes < 60) return text.min.replace("{n}", String(minutes));
  const hours = Math.round(minutes / 60);
  if (hours < 24) return text.h.replace("{n}", String(hours));
  return text.d.replace("{n}", String(Math.round(hours / 24)));
}

// Les messages d'erreur de l'API sont en français seulement : on les traduit
// à partir du code HTTP et du contexte, le texte serveur n'est qu'un dernier recours.
export function errorMessage(t: Translate, error: unknown, context: "report" | "vote" | "delete"): string {
  if (!(error instanceof ApiError)) return t("Konbit.genericError");
  switch (error.status) {
    case 0:
      return t("App.errors.offline");
    case 429:
      return t(context === "report" ? "App.errors.reportRateLimited" : "App.errors.voteRateLimited");
    case 404:
      return t(context === "delete" ? "App.errors.reportGone" : "App.errors.incidentGone");
    case 403:
      return t("App.errors.notYourReport");
    case 410:
      return t("App.errors.deleteTooLate");
    case 400:
      if (error.serverMessage?.includes("Commune")) return t("App.errors.unknownCommune");
      return error.serverMessage ?? t("Konbit.genericError");
    default:
      return t("Konbit.genericError");
  }
}
