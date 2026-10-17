import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, CloudRain, CloudSun, Droplets, Sunrise, Sunset, Umbrella, Wind } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { Text } from "@/components/ui/Text";
import { useWeatherCities, useWeatherCity, useWeatherFor } from "@/hooks/useKonbit";
import type { HourlyForecast } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { formatRelative, useI18n, type Translate } from "@/lib/i18n";
import { weatherGradient, weatherIcon } from "@/lib/weatherVisuals";

// Météo : même contenu que haitiscope.com/meteo (ville au choix, conditions
// actuelles, alerte pluie, prochaines heures, 7 prochains jours).

// Mêmes seuils que le web (web/lib/weather.ts).
const OUTLOOK_WINDOW_HOURS = 3;
const HEAVY_RAIN_THRESHOLD = 70;
const RAIN_LIKELY_THRESHOLD = 40;
type Outlook = "good" | "rain-likely" | "heavy-rain";

function computeOutlook(hourly: HourlyForecast[]): Outlook {
  const window = hourly.slice(0, OUTLOOK_WINDOW_HOURS);
  const hasThunder = window.some((h) => h.condition === "thunderstorm");
  const maxProbability = window.reduce((max, h) => Math.max(max, h.precipProbability), 0);
  if (hasThunder || maxProbability >= HEAVY_RAIN_THRESHOLD) return "heavy-rain";
  if (maxProbability >= RAIN_LIKELY_THRESHOLD) return "rain-likely";
  return "good";
}

const DAY_NAMES: Record<string, string[]> = {
  ht: ["Dim", "Len", "Mad", "Mèk", "Jed", "Van", "Sam"],
  fr: ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."],
};

function conditionLabel(t: Translate, condition: string) {
  const key = `Weather.condition.${condition}`;
  const label = t(key);
  return label === key ? condition : label;
}

// Les heures de l'API sont déjà en heure d'Haïti, sans fuseau : on lit l'heure
// directement dans la chaîne pour ne pas la décaler selon le téléphone.
const hourOf = (iso: string) => Number(iso.slice(11, 13));

export default function WeatherScreen() {
  const { t, language } = useI18n();
  const router = useRouter();
  const cities = useWeatherCities();
  // Ville partagée avec la carte de l'Accueil et gardée d'une ouverture à l'autre.
  const [city, chooseCity] = useWeatherCity();
  const weather = useWeatherFor(city);
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await weather.refetch();
    setRefreshing(false);
  }

  const sortedCities = useMemo(
    () => [...(cities.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [cities.data],
  );
  const w = weather.data;
  const outlook = w?.hourly ? computeOutlook(w.hourly) : null;
  const hourSuffix = language === "ht" ? "è" : " h";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel={t("App.close")}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {t("Weather.titleHub")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cities}>
          {sortedCities.map((c) => (
            <Pressable
              key={c.slug}
              onPress={() => chooseCity(c.slug)}
              style={[styles.cityChip, city === c.slug && styles.cityChipActive]}
            >
              <Text style={[styles.cityText, city === c.slug && styles.cityTextActive]}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {weather.isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
        ) : !w ? (
          <Text style={styles.muted}>{t("Weather.noData")}</Text>
        ) : (
          <>
            {/* Conditions actuelles */}
            <LinearGradient
              colors={weatherGradient(w.condition, w.isDay ?? true)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nowCard}
            >
              <Text style={styles.cityName}>{w.city.name}</Text>
              <View style={styles.nowRow}>
                {React.createElement(weatherIcon(w.condition, w.isDay ?? true), { size: 48, color: "#FFFFFF", strokeWidth: 1.5 })}
                <Text style={styles.temp}>{Math.round(Number(w.tempC))}°C</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.condition}>{conditionLabel(t, w.condition)}</Text>
                  <Text style={styles.feels}>
                    {t("Weather.feelsLike", { temp: `${Math.round(Number(w.feelsLikeC))}°C` })}
                  </Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                {w.humidity !== undefined && (
                  <Stat Icon={Droplets} label={t("Weather.humidity")} value={`${Math.round(w.humidity)}%`} />
                )}
                {w.windKph !== undefined && (
                  <Stat Icon={Wind} label={t("Weather.wind")} value={`${formatNumber(Number(w.windKph), 1)} km/h`} />
                )}
                {w.sunrise && <Stat Icon={Sunrise} label={t("Weather.sunrise")} value={w.sunrise} />}
                {w.sunset && <Stat Icon={Sunset} label={t("Weather.sunset")} value={w.sunset} />}
              </View>
            </LinearGradient>

            {/* Alerte pluie */}
            {outlook && (
              <View style={[styles.outlook, styles[`outlook_${outlook}` as const]]}>
                {outlook === "good" ? (
                  <CloudSun size={20} color="#15803D" />
                ) : outlook === "rain-likely" ? (
                  <Umbrella size={20} color="#B45309" />
                ) : (
                  <CloudRain size={20} color={Colors.secondary} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.outlookTitle}>
                    {outlook === "good"
                      ? t("Weather.outlookGoodTitle")
                      : outlook === "rain-likely"
                        ? t("Weather.outlookRainLikelyTitle")
                        : t("Weather.outlookHeavyRainTitle")}
                  </Text>
                  <Text style={styles.outlookCaption}>{t("Weather.outlookCaption")}</Text>
                </View>
              </View>
            )}

            {/* Prochaines heures */}
            {w.hourly && w.hourly.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t("Weather.hourlyTitle")}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hours}>
                  {w.hourly.slice(0, 12).map((h) => (
                    <View key={h.time} style={styles.hour}>
                      <Text style={styles.hourLabel}>
                        {hourOf(h.time)}
                        {hourSuffix}
                      </Text>
                      <Text style={styles.hourTemp}>{Math.round(h.tempC)}°</Text>
                      <Text style={styles.hourRain}>{h.precipProbability >= 30 ? `${h.precipProbability}%` : " "}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* 7 prochains jours */}
            {w.daily && w.daily.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t("Weather.dailyTitle")}</Text>
                {w.daily.map((d) => {
                  const [y, m, day] = d.date.split("-").map(Number);
                  const weekday = DAY_NAMES[language][new Date(y, m - 1, day).getDay()];
                  return (
                    <View key={d.date} style={styles.dayRow}>
                      <Text style={styles.dayName}>
                        {weekday} {day}
                      </Text>
                      <Text style={styles.dayCondition} numberOfLines={1}>
                        {conditionLabel(t, d.condition)}
                      </Text>
                      <Text style={styles.dayRain}>{d.precipProbability >= 30 ? `${d.precipProbability}%` : ""}</Text>
                      <Text style={styles.dayTemps}>
                        {Math.round(d.tempMaxC)}° / <Text style={styles.dayMin}>{Math.round(d.tempMinC)}°</Text>
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={styles.updated}>
              {t("Weather.lastUpdated", { time: formatRelative(w.fetchedAt, language) })}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ Icon, label, value }: { Icon: typeof Wind; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Icon size={16} color="rgba(255,255,255,0.85)" />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceWarm },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  title: { flex: 1, fontSize: 18, fontWeight: "800", color: Colors.text },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  cities: { gap: 8, paddingRight: 8 },
  cityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cityChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  cityText: { fontSize: 13, fontWeight: "600", color: Colors.text },
  cityTextActive: { color: "#FFFFFF" },
  muted: { fontSize: 14, color: Colors.textMuted, textAlign: "center" },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#EEEEE8",
  },
  nowCard: { borderRadius: 20, padding: 16, gap: 10, overflow: "hidden" },
  cityName: { fontSize: 15, fontWeight: "700", color: "rgba(255,255,255,0.9)" },
  nowRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  temp: { fontSize: 44, fontWeight: "800", color: "#FFFFFF" },
  condition: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  feels: { fontSize: 13, color: "rgba(255,255,255,0.85)" },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  stat: {
    width: "48%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: 8,
  },
  statLabel: { flex: 1, fontSize: 12, color: "rgba(255,255,255,0.85)" },
  statValue: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  outlook: { flexDirection: "row", gap: 10, borderRadius: 14, padding: 12, alignItems: "flex-start" },
  "outlook_good": { backgroundColor: "#DCFCE7" },
  "outlook_rain-likely": { backgroundColor: "#FEF3C7" },
  "outlook_heavy-rain": { backgroundColor: "#FEE2E2" },
  outlookTitle: { fontSize: 15, fontWeight: "700", color: Colors.text },
  outlookCaption: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: Colors.text },
  hours: { gap: 8 },
  hour: {
    width: 58,
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 12,
    paddingVertical: 10,
  },
  hourLabel: { fontSize: 12, color: Colors.textMuted },
  hourTemp: { fontSize: 16, fontWeight: "800", color: Colors.text },
  hourRain: { fontSize: 11, color: "#0284C7", fontWeight: "600" },
  dayRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  dayName: { width: 64, fontSize: 14, fontWeight: "700", color: Colors.text },
  dayCondition: { flex: 1, fontSize: 14, color: Colors.textLight },
  dayRain: { width: 40, textAlign: "right", fontSize: 12, color: "#0284C7", fontWeight: "600" },
  dayTemps: { width: 70, textAlign: "right", fontSize: 14, fontWeight: "700", color: Colors.text },
  dayMin: { fontWeight: "400", color: Colors.textMuted },
  updated: { fontSize: 12, color: Colors.textMuted, textAlign: "center" },
});
