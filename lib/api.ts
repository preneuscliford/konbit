// Client de l'API HaitiScope. Contrat complet : konbit-mobile-api.md.
// Pas d'authentification : le jeton anonyme de l'appareil (UUID v4) passe
// dans le body ou la query.

export const API_BASE_URL = "https://api.haitiscope.com/api/v1";
const KONBIT_URL = `${API_BASE_URL}/konbit`;
const TIMEOUT_MS = 15_000;

export type KonbitModule = "utility" | "security";

// Gardé en `string` et non en union fermée : une app publiée doit survivre à
// une catégorie ajoutée plus tard côté serveur (affichage générique).
export type KonbitCategory = string;

export interface KonbitCommune {
  slug: string;
  name: string;
  department: string;
}

export interface KonbitIncident {
  id: number;
  module: KonbitModule;
  category: KonbitCategory;
  communeSlug: string;
  communeName: string;
  department: string;
  reportCount: number;
  confirmCount: number;
  disputeCount: number;
  latestNote: string | null;
  firstReportAt: string;
  publishedAt: string;
  expiresAt: string;
  reactions: Record<string, number>;
}

export type VoteStance = "confirm" | "dispute";
export type VoteOutcome = "voted" | "switched" | "already-voted" | "own-report";

export interface VoteResult {
  confirmCount: number;
  disputeCount: number;
  outcome: VoteOutcome;
}

export interface SubmitReportInput {
  module: KonbitModule;
  category: KonbitCategory;
  tokenId: string;
  communeSlug: string;
  note?: string;
}

export interface SubmitReportResult {
  reportId: number;
  incidentId: number;
  confirmCount: number;
}

export interface UsdRate {
  marketAskBest: string | null;
  officialRate: string | null;
  syntheticRate: string | null;
  updatedAt: string;
}

// Une paire de devises (USD-HTG, EUR-HTG, CAD-HTG) telle que /rates/latest la renvoie.
export interface LatestRate extends UsdRate {
  pairCode: string;
  hasMarketData: boolean;
  officialFetchedAt: string | null;
  marketBidBest: string | null;
  marketFetchedAt: string | null;
  syntheticFetchedAt: string | null;
}

export type RateRange = "24h" | "7d" | "30d" | "1y";

export interface RateHistory {
  pair: string;
  official: { rate: string; fetchedAt: string }[];
  market?: { askBest: string; bidBest: string; fetchedAt: string }[];
  synthetic?: { rate: string; fetchedAt: string }[];
}

export interface RateSignals {
  median: number | null;
  count: number;
  recent: { rate: number; amount: number | null; locationLabel: string | null; createdAt: string }[];
}

export interface WeatherCity {
  slug: string;
  name: string;
  department: string;
}

export interface HourlyForecast {
  time: string; // heure locale d'Haïti, sans fuseau (ex. 2026-10-16T13:00:00)
  isDay?: boolean;
  tempC: number;
  condition: string;
  precipProbability: number;
}

export interface DailyForecast {
  date: string; // AAAA-MM-JJ
  tempMaxC: number;
  tempMinC: number;
  condition: string;
  precipProbability: number;
}

export interface CurrentWeather {
  city: { slug: string; name: string };
  tempC: string;
  feelsLikeC: string;
  condition: string;
  isDay?: boolean;
  humidity?: number;
  windKph?: string;
  sunrise?: string;
  sunset?: string;
  fetchedAt: string;
  hourly?: HourlyForecast[];
  daily?: DailyForecast[];
}

// status 0 = pas de réponse du serveur (pas de réseau, délai dépassé).
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly serverMessage: string | null,
  ) {
    super(serverMessage ?? `HTTP ${status}`);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: controller.signal });
  } catch {
    throw new ApiError(0, null);
  } finally {
    clearTimeout(timeout);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.error ?? null);
  return body as T;
}

function postJson<T>(url: string, payload: unknown): Promise<T> {
  return request<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export const getIncidents = () => request<KonbitIncident[]>(`${KONBIT_URL}/incidents`);

export const getCommunes = () => request<KonbitCommune[]>(`${KONBIT_URL}/communes`);

export const submitReport = (input: SubmitReportInput) =>
  postJson<SubmitReportResult>(`${KONBIT_URL}/reports`, input);

export const deleteReport = (reportId: number, tokenId: string) =>
  request<{ deleted: boolean; incidentDeleted: boolean }>(
    `${KONBIT_URL}/reports/${reportId}?tokenId=${encodeURIComponent(tokenId)}`,
    { method: "DELETE" },
  );

export const voteIncident = (incidentId: number, stance: VoteStance, tokenId: string) =>
  postJson<VoteResult>(`${KONBIT_URL}/incidents/${incidentId}/${stance}`, { tokenId });

export const getLatestRates = () => request<LatestRate[]>(`${API_BASE_URL}/rates/latest`);

export async function getUsdRate(): Promise<UsdRate | null> {
  const rates = await getLatestRates();
  return rates.find((r) => r.pairCode === "USD-HTG") ?? null;
}

export const getRateHistory = (pair: string, range: RateRange) =>
  request<RateHistory>(`${API_BASE_URL}/rates/history?pair=${encodeURIComponent(pair)}&range=${range}`);

// Taux réellement obtenus, signalés par la communauté (même endpoint que le web).
export const getRateSignals = (pair: string) =>
  request<RateSignals>(`${API_BASE_URL}/signals/rate?pair=${encodeURIComponent(pair)}&range=24h`);

export const submitRateSignal = (input: {
  pair: string;
  reportedRate: number;
  amount?: number;
  locationLabel?: string;
}) => postJson<{ ok: true }>(`${API_BASE_URL}/signals/rate`, input);

export const getWeatherCities = () => request<WeatherCity[]>(`${API_BASE_URL}/weather/cities`);

export const getWeatherFor = (slug: string) =>
  request<CurrentWeather>(`${API_BASE_URL}/weather/${encodeURIComponent(slug)}`);

// Même ville que la note auto côté serveur (computeAutoNote).
export const getWeather = () => getWeatherFor("port-au-prince");

// Même priorité que computeAutoNote côté serveur.
export function bestUsdRate(rate: UsdRate | null | undefined): number | null {
  const value = rate?.marketAskBest ?? rate?.officialRate ?? rate?.syntheticRate;
  return value ? Number(value) : null;
}
