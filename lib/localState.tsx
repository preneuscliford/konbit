import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { VoteStance } from "./api";

// État propre à cet appareil, mêmes clés que le web (localStorage).
// Le serveur ne permet pas de relire les votes ou signalements d'un jeton :
// ce stockage est la seule source pour savoir ce qui est "à moi". Le vrai
// contrôle d'accès reste côté serveur (jeton).
const KEYS = {
  token: "konbit-token",
  myReports: "konbit-my-reports",
  votes: "konbit-votes",
  preferredCommune: "konbit-preferred-commune",
};

const SELF_DELETE_WINDOW_MS = 24 * 3600e3;

export interface MyReport {
  reportId: number;
  incidentId: number;
  createdAt: number;
}

interface LocalStateValue {
  ready: boolean;
  // Identité anonyme de l'appareil : créée une fois, jamais régénérée.
  token: string;
  myReportFor: (incidentId: number) => number | null;
  rememberReport: (reportId: number, incidentId: number) => void;
  forgetReport: (reportId: number) => void;
  votes: Record<number, VoteStance>;
  rememberVote: (incidentId: number, stance: VoteStance) => void;
  // Slug de commune, ou "all" (flux national par défaut).
  preferredCommune: string;
  setPreferredCommune: (slug: string) => void;
}

const LocalStateContext = createContext<LocalStateValue | null>(null);

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const withinDeleteWindow = (reports: MyReport[]) =>
  reports.filter((r) => r.createdAt >= Date.now() - SELF_DELETE_WINDOW_MS);

function persist(key: string, value: unknown) {
  AsyncStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value)).catch(() => {});
}

export function LocalStateProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState("");
  const [myReports, setMyReports] = useState<MyReport[]>([]);
  const [votes, setVotes] = useState<Record<number, VoteStance>>({});
  const [preferredCommune, setPreferredCommuneState] = useState("all");

  useEffect(() => {
    AsyncStorage.multiGet(Object.values(KEYS))
      .then((entries) => {
        const stored = Object.fromEntries(entries);
        let savedToken = stored[KEYS.token];
        if (!savedToken) {
          savedToken = Crypto.randomUUID();
          persist(KEYS.token, savedToken);
        }
        setToken(savedToken);
        setMyReports(withinDeleteWindow(parse<MyReport[]>(stored[KEYS.myReports], [])));
        setVotes(parse(stored[KEYS.votes], {}));
        setPreferredCommuneState(stored[KEYS.preferredCommune] || "all");
      })
      .catch(() => setToken(Crypto.randomUUID()))
      .finally(() => setReady(true));
  }, []);

  const myReportFor = useCallback(
    (incidentId: number) => {
      const mine = withinDeleteWindow(myReports).filter((r) => r.incidentId === incidentId);
      return mine.length ? mine[mine.length - 1].reportId : null;
    },
    [myReports],
  );

  const rememberReport = useCallback((reportId: number, incidentId: number) => {
    setMyReports((prev) => {
      const next = [...withinDeleteWindow(prev), { reportId, incidentId, createdAt: Date.now() }];
      persist(KEYS.myReports, next);
      return next;
    });
  }, []);

  const forgetReport = useCallback((reportId: number) => {
    setMyReports((prev) => {
      const next = withinDeleteWindow(prev).filter((r) => r.reportId !== reportId);
      persist(KEYS.myReports, next);
      return next;
    });
  }, []);

  const rememberVote = useCallback((incidentId: number, stance: VoteStance) => {
    setVotes((prev) => {
      const next = { ...prev, [incidentId]: stance };
      persist(KEYS.votes, next);
      return next;
    });
  }, []);

  const setPreferredCommune = useCallback((slug: string) => {
    setPreferredCommuneState(slug);
    persist(KEYS.preferredCommune, slug);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      token,
      myReportFor,
      rememberReport,
      forgetReport,
      votes,
      rememberVote,
      preferredCommune,
      setPreferredCommune,
    }),
    [ready, token, myReportFor, rememberReport, forgetReport, votes, rememberVote, preferredCommune, setPreferredCommune],
  );

  return <LocalStateContext.Provider value={value}>{children}</LocalStateContext.Provider>;
}

export function useLocalState() {
  const value = useContext(LocalStateContext);
  if (!value) throw new Error("useLocalState doit être utilisé dans <LocalStateProvider>");
  return value;
}
