import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCommunes,
  getIncidents,
  getLatestRates,
  getRateHistory,
  getRateSignals,
  getUsdRate,
  getWeather,
  getWeatherCities,
  getWeatherFor,
  type KonbitCommune,
  type RateRange,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export const INCIDENTS_KEY = ["konbit", "incidents"] as const;

// Même rythme que le web (20 s). Le poll s'arrête quand l'app passe en
// arrière-plan : focusManager suit l'AppState (hooks/useAppState.ts).
export function useIncidents() {
  return useQuery({
    queryKey: INCIDENTS_KEY,
    queryFn: getIncidents,
    refetchInterval: 20_000,
    staleTime: 10_000,
  });
}

const COMMUNES_STORAGE_KEY = "konbit-communes-cache";

// Rechargées à chaque lancement (la liste peut être corrigée côté serveur),
// avec la dernière copie connue en secours si le réseau ne répond pas.
async function fetchCommunes(): Promise<KonbitCommune[]> {
  try {
    const communes = await getCommunes();
    AsyncStorage.setItem(COMMUNES_STORAGE_KEY, JSON.stringify(communes)).catch(() => {});
    return communes;
  } catch (error) {
    const cached = await AsyncStorage.getItem(COMMUNES_STORAGE_KEY).catch(() => null);
    if (cached) return JSON.parse(cached) as KonbitCommune[];
    throw error;
  }
}

// L'API appelle la commune "national" « Tout le territoire » : l'app l'affiche
// « Nasyonal » / « National » partout (sélecteurs, recherche, cartes).
export function useCommunes() {
  const { t } = useI18n();
  const nationalLabel = t("App.national");
  const select = useCallback(
    (communes: KonbitCommune[]) =>
      communes.map((c) => (c.slug === "national" ? { ...c, name: nationalLabel } : c)),
    [nationalLabel],
  );
  return useQuery({
    queryKey: ["konbit", "communes"],
    queryFn: fetchCommunes,
    staleTime: Infinity,
    select,
  });
}

export function useUsdRate() {
  return useQuery({ queryKey: ["haitiscope", "usd-rate"], queryFn: getUsdRate, staleTime: 10 * 60_000 });
}

export function useWeather() {
  return useQuery({ queryKey: ["haitiscope", "weather"], queryFn: getWeather, staleTime: 10 * 60_000 });
}

// Écrans Taux et Météo (mêmes données que haitiscope.com et /meteo).
export function useLatestRates() {
  return useQuery({ queryKey: ["haitiscope", "rates"], queryFn: getLatestRates, staleTime: 5 * 60_000 });
}

export function useRateHistory(range: RateRange) {
  return useQuery({
    queryKey: ["haitiscope", "rate-history", range],
    queryFn: () => getRateHistory("USD-HTG", range),
    staleTime: 15 * 60_000,
  });
}

export function useRateSignals() {
  return useQuery({
    queryKey: ["haitiscope", "rate-signals"],
    queryFn: () => getRateSignals("USD-HTG"),
    staleTime: 60_000,
  });
}

export function useWeatherCities() {
  return useQuery({ queryKey: ["haitiscope", "weather-cities"], queryFn: getWeatherCities, staleTime: Infinity });
}

export function useWeatherFor(slug: string) {
  return useQuery({
    queryKey: ["haitiscope", "weather", slug],
    queryFn: () => getWeatherFor(slug),
    staleTime: 10 * 60_000,
  });
}

// Ville météo choisie (écran Météo), partagée avec la carte de l'Accueil et
// gardée d'une ouverture à l'autre.
const WEATHER_CITY_KEY = "konbit-weather-city";
export const DEFAULT_WEATHER_CITY = "port-au-prince";

export function useWeatherCity() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["prefs", "weather-city"],
    queryFn: async () => (await AsyncStorage.getItem(WEATHER_CITY_KEY).catch(() => null)) ?? DEFAULT_WEATHER_CITY,
    staleTime: Infinity,
  });
  const setCity = useCallback(
    (slug: string) => {
      queryClient.setQueryData(["prefs", "weather-city"], slug);
      AsyncStorage.setItem(WEATHER_CITY_KEY, slug).catch(() => {});
    },
    [queryClient],
  );
  return [query.data ?? DEFAULT_WEATHER_CITY, setCity] as const;
}
