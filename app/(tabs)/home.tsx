import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight, Minus, TrendingDown, TrendingUp, Umbrella } from "lucide-react-native";
import Colors from "@/constants/Colors";
import AppHeader from "@/components/AppHeader";
import OfflineBanner from "@/components/konbit/OfflineBanner";
import Sparkline from "@/components/ui/Sparkline";
import { Text } from "@/components/ui/Text";
import { useRateHistory, useUsdRate, useWeatherCity, useWeatherFor } from "@/hooks/useKonbit";
import { formatNumber } from "@/lib/format";
import { formatRelative, useI18n, type Translate } from "@/lib/i18n";
import { weatherGradient, weatherIcon } from "@/lib/weatherVisuals";

// Accueil : l'info du jour en aperçu (gourde, météo), depuis l'API HaïtiScope.
// Chaque carte ouvre son écran détaillé (app/rates.tsx, app/weather.tsx).
// Les événements viendront plus tard (derrière un feature flag).

const WEEKDAYS: Record<string, string[]> = {
  ht: ["Dimanch", "Lendi", "Madi", "Mèkredi", "Jedi", "Vandredi", "Samdi"],
  fr: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
};
const MONTHS: Record<string, string[]> = {
  ht: ["janvye", "fevriye", "mas", "avril", "me", "jen", "jiyè", "out", "septanm", "oktòb", "novanm", "desanm"],
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
};

function conditionLabel(t: Translate, condition: string) {
  const key = `Weather.condition.${condition}`;
  const label = t(key);
  return label === key ? condition : label;
}

export default function HomeScreen() {
  const { t, language } = useI18n();
  const rate = useUsdRate();
  const history = useRateHistory("7d");
  const [city] = useWeatherCity();
  const weather = useWeatherFor(city);
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([rate.refetch(), history.refetch(), weather.refetch()]);
    setRefreshing(false);
  }

  const now = new Date();
  const today = `${WEEKDAYS[language][now.getDay()]} ${now.getDate()} ${MONTHS[language][now.getMonth()]}`;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AppHeader />
      <OfflineBanner />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View>
          <Text style={styles.date}>{today}</Text>
          <Text style={styles.heading}>{t("App.home.title")}</Text>
        </View>

        <RatePreview rate={rate} history={history} />
        <WeatherPreview weather={weather} />

        <Text style={styles.source}>{t("App.dataSource")}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// Gourde : taux du marché en grand, évolution sur 7 jours, mini-courbe.
function RatePreview({
  rate,
  history,
}: {
  rate: ReturnType<typeof useUsdRate>;
  history: ReturnType<typeof useRateHistory>;
}) {
  const { t, language } = useI18n();
  const router = useRouter();

  const market = rate.data?.marketAskBest ? Number(rate.data.marketAskBest) : null;
  const official = rate.data?.officialRate ? Number(rate.data.officialRate) : null;
  const main = market ?? official;

  const points = useMemo(() => {
    const h = history.data;
    if (!h) return [];
    return h.market?.length ? h.market.map((p) => Number(p.askBest)) : h.official.map((p) => Number(p.rate));
  }, [history.data]);
  const change = points.length > 1 ? ((points[points.length - 1] - points[0]) / points[0]) * 100 : null;
  const TrendIcon = change === null || Math.abs(change) < 0.05 ? Minus : change > 0 ? TrendingUp : TrendingDown;

  return (
    <Pressable onPress={() => router.push("/rates")} accessibilityRole="button" style={styles.cardShadow}>
      <LinearGradient colors={["#00209F", "#2541C4"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardKicker}>HTG / USD</Text>
          <ChevronRight size={18} color="rgba(255,255,255,0.8)" />
        </View>

        {rate.isLoading ? (
          <ActivityIndicator color="#FFFFFF" style={{ marginVertical: 24 }} />
        ) : main === null ? (
          <Text style={styles.lightMuted}>{t("App.home.unavailable")}</Text>
        ) : (
          <>
            <Text style={styles.lightLabel}>{market !== null ? t("Home.marketRate") : t("Home.officialRate")}</Text>
            <View style={styles.bigRow}>
              <Text style={styles.bigValue}>{formatNumber(main, 2)}</Text>
              <Text style={styles.bigUnit}>HTG</Text>
              {change !== null && (
                <View style={styles.pill}>
                  <TrendIcon size={14} color="#FFFFFF" />
                  <Text style={styles.pillText}>
                    {change > 0 ? "+" : ""}
                    {formatNumber(change, 2)}% · {t("App.rates.range.7d")}
                  </Text>
                </View>
              )}
            </View>

            <Sparkline values={points} height={64} />

            <View style={styles.statsRow}>
              {official !== null && market !== null && (
                <>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>BRH</Text>
                    <Text style={styles.statValue}>{formatNumber(official, 2)}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>{t("Home.spreadVsOfficial")}</Text>
                    <Text style={styles.statValue}>+{formatNumber(((market - official) / official) * 100, 2)}%</Text>
                  </View>
                </>
              )}
              {rate.data?.updatedAt && (
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>{t("App.home.updatedShort")}</Text>
                  <Text style={styles.statValue}>{formatRelative(rate.data.updatedAt, language)}</Text>
                </View>
              )}
            </View>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

// Météo : dégradé selon le ciel, grande température, alerte pluie, 6 prochaines heures.
function WeatherPreview({ weather }: { weather: ReturnType<typeof useWeatherFor> }) {
  const { t, language } = useI18n();
  const router = useRouter();
  const w = weather.data;
  const colors = weatherGradient(w?.condition ?? "partly-cloudy", w?.isDay ?? true);
  const Icon = weatherIcon(w?.condition ?? "partly-cloudy", w?.isDay ?? true);
  const nextHours = w?.hourly?.slice(1, 7) ?? [];
  const rainSoon = w?.hourly?.slice(0, 3).reduce((max, h) => Math.max(max, h.precipProbability), 0) ?? 0;
  const hourSuffix = language === "ht" ? "è" : " h";

  return (
    <Pressable onPress={() => router.push("/weather")} accessibilityRole="button" style={styles.cardShadow}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardKicker}>{w?.city.name ?? t("App.weatherLabel")}</Text>
          <ChevronRight size={18} color="rgba(255,255,255,0.8)" />
        </View>

        {weather.isLoading ? (
          <ActivityIndicator color="#FFFFFF" style={{ marginVertical: 24 }} />
        ) : !w ? (
          <Text style={styles.lightMuted}>{t("App.home.unavailable")}</Text>
        ) : (
          <>
            <View style={styles.weatherNow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.temp}>{Math.round(Number(w.tempC))}°</Text>
                <Text style={styles.conditionText}>{conditionLabel(t, w.condition)}</Text>
                <Text style={styles.lightMuted}>
                  {t("Weather.feelsLike", { temp: `${Math.round(Number(w.feelsLikeC))}°` })}
                </Text>
              </View>
              <Icon size={76} color="#FFFFFF" strokeWidth={1.4} />
            </View>

            {rainSoon >= 40 && (
              <View style={styles.alertPill}>
                <Umbrella size={14} color="#FFFFFF" />
                <Text style={styles.pillText}>
                  {rainSoon >= 70 ? t("Weather.outlookHeavyRainTitle") : t("Weather.outlookRainLikelyTitle")}
                </Text>
              </View>
            )}

            {nextHours.length > 0 && (
              <View style={styles.hoursRow}>
                {nextHours.map((h) => {
                  const HourIcon = weatherIcon(h.condition, h.isDay ?? true);
                  return (
                    <View key={h.time} style={styles.hour}>
                      <Text style={styles.hourLabel}>
                        {Number(h.time.slice(11, 13))}
                        {hourSuffix}
                      </Text>
                      <HourIcon size={18} color="#FFFFFF" />
                      <Text style={styles.hourTemp}>{Math.round(h.tempC)}°</Text>
                      <Text style={styles.hourRain}>{h.precipProbability >= 30 ? `${h.precipProbability}%` : " "}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceWarm },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  date: { fontSize: 13, color: Colors.textMuted, fontWeight: "600" },
  heading: { fontSize: 24, fontWeight: "800", color: Colors.text },
  cardShadow: {
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#00145F",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  gradientCard: { borderRadius: 22, padding: 18, gap: 10, overflow: "hidden" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardKicker: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.85)", letterSpacing: 0.5 },
  lightLabel: { fontSize: 13, color: "rgba(255,255,255,0.8)" },
  lightMuted: { fontSize: 13, color: "rgba(255,255,255,0.8)" },
  bigRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 6, marginTop: -6 },
  bigValue: { fontSize: 40, fontWeight: "800", color: "#FFFFFF" },
  bigUnit: { fontSize: 16, fontWeight: "700", color: "rgba(255,255,255,0.85)" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: "auto",
  },
  pillText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  statsRow: { flexDirection: "row", gap: 8 },
  statBox: { flex: 1, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.75)" },
  statValue: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
  weatherNow: { flexDirection: "row", alignItems: "center", gap: 12 },
  temp: { fontSize: 56, fontWeight: "800", color: "#FFFFFF", lineHeight: 64 },
  conditionText: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  alertPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(210,16,52,0.85)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  hour: { alignItems: "center", gap: 4, flex: 1 },
  hourLabel: { fontSize: 11, color: "rgba(255,255,255,0.8)" },
  hourTemp: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  hourRain: { fontSize: 10, fontWeight: "700", color: "#BAE6FD" },
  source: { fontSize: 11, color: Colors.textMuted, textAlign: "center" },
});
