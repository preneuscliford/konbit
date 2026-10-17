import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowLeftRight, TriangleAlert } from "lucide-react-native";
import Colors from "@/constants/Colors";
import LineChart from "@/components/ui/LineChart";
import { Text, TextInput } from "@/components/ui/Text";
import { useLatestRates, useRateHistory, useRateSignals } from "@/hooks/useKonbit";
import { ApiError, submitRateSignal, type LatestRate, type RateRange } from "@/lib/api";
import { formatNumber, formatShortDate, formatShortTime } from "@/lib/format";
import { formatRelative, useI18n } from "@/lib/i18n";

// Taux du jour : même contenu que haitiscope.com (taux officiel BRH, marché
// réel P2P, écart, EUR/CAD convertis, historique, convertisseur, "Mon taux
// est-il bon ?", taux signalés par la communauté).

const RANGES: RateRange[] = ["24h", "7d", "30d", "1y"];
const CURRENCIES = ["USD", "EUR", "CAD"] as const;
type Currency = (typeof CURRENCIES)[number];
const QUICK_AMOUNTS = [20, 50, 100, 200, 500, 1000];
// Même seuils que le web (rate-helpers.ts, rate-check-tool.tsx).
const STALE_MS = 2 * 3600e3;
const GOOD_RATE_THRESHOLD_PCT = -0.5;

type RateType = "market" | "official" | "synthetic";

// Le taux "à afficher en priorité" : marché réel, sinon officiel, sinon converti.
// Jamais de moyenne entre les trois (ce sont des faits différents).
function displayRate(r: LatestRate | undefined): { rate: number; type: RateType; at: string | null } | null {
  if (!r) return null;
  if (r.hasMarketData && r.marketAskBest) return { rate: Number(r.marketAskBest), type: "market", at: r.marketFetchedAt };
  if (r.officialRate) return { rate: Number(r.officialRate), type: "official", at: r.officialFetchedAt };
  if (r.syntheticRate) return { rate: Number(r.syntheticRate), type: "synthetic", at: r.syntheticFetchedAt };
  return null;
}

export default function RatesScreen() {
  const { t, language } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const latest = useLatestRates();
  const signals = useRateSignals();
  const [range, setRange] = useState<RateRange>("7d");
  const history = useRateHistory(range);
  const [refreshing, setRefreshing] = useState(false);

  const byPair = useMemo(() => new Map((latest.data ?? []).map((r) => [r.pairCode, r])), [latest.data]);
  const usd = byPair.get("USD-HTG");
  const official = usd?.officialRate ? Number(usd.officialRate) : null;
  const market = usd?.marketAskBest ? Number(usd.marketAskBest) : null;
  const usdDisplay = displayRate(usd);
  const stale = usdDisplay?.at ? Date.now() - new Date(usdDisplay.at).getTime() > STALE_MS : false;

  async function onRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["haitiscope"] });
    setRefreshing(false);
  }

  const rateTypeLabel = (type: RateType) =>
    type === "market"
      ? t("CurrencyConverter.rateTypeMarket")
      : type === "official"
        ? t("CurrencyConverter.rateTypeOfficial")
        : t("CurrencyConverter.rateTypeSynthetic");

  const chartSeries = useMemo(() => {
    const h = history.data;
    if (!h) return [];
    const series = [];
    if (h.market?.length) {
      series.push({
        label: t("Home.marketRate"),
        color: Colors.primary,
        points: h.market.map((p) => ({ t: new Date(p.fetchedAt).getTime(), v: Number(p.askBest) })),
      });
    }
    if (h.official.length) {
      series.push({
        label: t("Home.officialRate"),
        color: "#9CA3AF",
        points: h.official.map((p) => ({ t: new Date(p.fetchedAt).getTime(), v: Number(p.rate) })),
      });
    }
    return series;
  }, [history.data, t]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel={t("App.close")}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {t("Home.title")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {latest.isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
        ) : !usdDisplay ? (
          <Text style={styles.muted}>{t("Home.noData")}</Text>
        ) : (
          <>
            {usdDisplay.at && (
              <Text style={styles.updated}>
                {t("Home.lastUpdate", { time: formatRelative(usdDisplay.at, language) })}
              </Text>
            )}
            {stale && (
              <View style={styles.warning}>
                <TriangleAlert size={16} color="#B45309" />
                <Text style={styles.warningText}>{t("Home.staleWarning")}</Text>
              </View>
            )}

            <View style={styles.tiles}>
              {official !== null && (
                <View style={styles.tile}>
                  <Text style={styles.tileLabel}>{t("Home.officialRate")}</Text>
                  <Text style={styles.tileValue}>{formatNumber(official, 4)}</Text>
                  <Text style={styles.tileUnit}>HTG / USD</Text>
                </View>
              )}
              {market !== null && (
                <View style={[styles.tile, styles.tileMain]}>
                  <Text style={[styles.tileLabel, styles.tileLabelMain]}>{t("Home.marketRate")}</Text>
                  <Text style={[styles.tileValue, styles.tileValueMain]}>{formatNumber(market, 2)}</Text>
                  <Text style={[styles.tileUnit, styles.tileLabelMain]}>HTG / USD</Text>
                </View>
              )}
            </View>
            {official !== null && market !== null && (
              <View style={styles.spreadRow}>
                <Text style={styles.spreadLabel}>{t("Home.spreadVsOfficial")}</Text>
                <Text style={styles.spreadValue}>
                  {market >= official ? "+" : ""}
                  {formatNumber(((market - official) / official) * 100, 2)}%
                </Text>
              </View>
            )}
            {(["EUR-HTG", "CAD-HTG"] as const).map((pair) => {
              const d = displayRate(byPair.get(pair));
              return d ? (
                <Text key={pair} style={styles.cross}>
                  {t("Home.convertedApprox", { currency: pair.slice(0, 3), rate: formatNumber(d.rate, 4) })}
                </Text>
              ) : null;
            })}
          </>
        )}

        {/* Historique */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("Home.historyTitle")}</Text>
          <View style={styles.segment}>
            {RANGES.map((r) => (
              <Pressable
                key={r}
                onPress={() => setRange(r)}
                style={[styles.segmentItem, range === r && styles.segmentItemActive]}
              >
                <Text style={[styles.segmentText, range === r && styles.segmentTextActive]}>
                  {t(`App.rates.range.${r}`)}
                </Text>
              </Pressable>
            ))}
          </View>
          {history.isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 40 }} />
          ) : chartSeries.length ? (
            <LineChart
              series={chartSeries}
              formatValue={(v) => formatNumber(v, 1)}
              formatTime={range === "24h" ? formatShortTime : formatShortDate}
            />
          ) : (
            <Text style={styles.muted}>{t("Home.noData")}</Text>
          )}
        </View>

        <Converter byPair={byPair} rateTypeLabel={rateTypeLabel} />

        <RateCheck reference={usdDisplay} rateTypeLabel={rateTypeLabel} />

        <CommunitySignals signals={signals.data} onSent={() => signals.refetch()} />

        <Text style={styles.sources}>{t("App.rates.sources")}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Converter({
  byPair,
  rateTypeLabel,
}: {
  byPair: Map<string, LatestRate>;
  rateTypeLabel: (type: RateType) => string;
}) {
  const { t } = useI18n();
  const [amount, setAmount] = useState("100");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [toHtg, setToHtg] = useState(true);

  const rate = displayRate(byPair.get(`${currency}-HTG`));
  const value = Number(amount.replace(",", "."));
  const result = rate && value > 0 ? (toHtg ? value * rate.rate : value / rate.rate) : null;
  const from = toHtg ? currency : "HTG";
  const to = toHtg ? "HTG" : currency;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t("Home.converterTitle")}</Text>
      <View style={styles.segment}>
        {CURRENCIES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCurrency(c)}
            style={[styles.segmentItem, currency === c && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentText, currency === c && styles.segmentTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.converterRow}>
        <View style={styles.amountBox}>
          <TextInput
            value={amount}
            onChangeText={(text) => setAmount(text.replace(/[^0-9.,]/g, "").slice(0, 12))}
            keyboardType="decimal-pad"
            style={styles.amountInput}
            accessibilityLabel={t("CurrencyConverter.amount")}
          />
          <Text style={styles.amountCurrency}>{from}</Text>
        </View>
        <Pressable
          onPress={() => setToHtg((v) => !v)}
          style={styles.swap}
          hitSlop={8}
          accessibilityLabel={t("CurrencyConverter.swap")}
        >
          <ArrowLeftRight size={18} color={Colors.primary} />
        </Pressable>
        <View style={styles.resultBox}>
          <Text style={styles.resultValue} numberOfLines={1}>
            {result !== null ? formatNumber(result, toHtg ? 0 : 2) : "—"}
          </Text>
          <Text style={styles.amountCurrency}>{to}</Text>
        </View>
      </View>
      {rate && (
        <Text style={styles.muted}>
          {t("CurrencyConverter.resultRate", { type: rateTypeLabel(rate.type), rate: formatNumber(rate.rate, 2) })}
        </Text>
      )}
      <View style={styles.quickRow}>
        {QUICK_AMOUNTS.map((q) => (
          <Pressable key={q} onPress={() => setAmount(String(q))} style={styles.quick}>
            <Text style={styles.quickText}>{q}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function RateCheck({
  reference,
  rateTypeLabel,
}: {
  reference: { rate: number; type: RateType } | null;
  rateTypeLabel: (type: RateType) => string;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const obtained = Number(value.replace(",", "."));
  const verdict =
    reference && obtained > 0
      ? (() => {
          const deviationPct = ((obtained - reference.rate) / reference.rate) * 100;
          return { deviationPct, good: deviationPct >= GOOD_RATE_THRESHOLD_PCT };
        })()
      : null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t("Home.rateCheckTitle")}</Text>
      <Text style={styles.muted}>{t("Home.rateCheckSubtitle")}</Text>
      <TextInput
        value={value}
        onChangeText={(text) => setValue(text.replace(/[^0-9.,]/g, "").slice(0, 8))}
        keyboardType="decimal-pad"
        placeholder={t("RateCheckTool.placeholder")}
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
        accessibilityLabel={t("RateCheckTool.label")}
      />
      {verdict && reference && (
        <View style={[styles.verdict, verdict.good ? styles.verdictGood : styles.verdictBad]}>
          <Text style={[styles.verdictTitle, { color: verdict.good ? "#15803D" : Colors.secondary }]}>
            {verdict.good ? t("RateCheckTool.verdictGood") : t("RateCheckTool.verdictBad")}
          </Text>
          <Text style={styles.verdictText}>
            {t("RateCheckTool.deviationText", {
              direction: verdict.deviationPct >= 0 ? t("RateCheckTool.above") : t("RateCheckTool.below"),
              pct: formatNumber(Math.abs(verdict.deviationPct), 2),
              type:
                reference.type === "market" ? t("RateCheckTool.rateTypeMarket") : t("RateCheckTool.rateTypeOfficial"),
              rate: formatNumber(reference.rate, 2),
            })}
          </Text>
        </View>
      )}
    </View>
  );
}

function CommunitySignals({
  signals,
  onSent,
}: {
  signals: { median: number | null; count: number } | undefined;
  onSent: () => void;
}) {
  const { t } = useI18n();
  const [rate, setRate] = useState("");
  const [amount, setAmount] = useState("");
  const [location, setLocation] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  async function send() {
    const reportedRate = Number(rate.replace(",", "."));
    if (!(reportedRate > 0)) {
      setFeedback({ ok: false, message: t("CommunitySignalForm.invalidRate") });
      return;
    }
    setFeedback(null);
    setSending(true);
    try {
      const amountValue = Number(amount.replace(",", "."));
      await submitRateSignal({
        pair: "USD-HTG",
        reportedRate,
        ...(amountValue > 0 ? { amount: amountValue } : {}),
        ...(location.trim() ? { locationLabel: location.trim().slice(0, 120) } : {}),
      });
      setRate("");
      setAmount("");
      setFeedback({ ok: true, message: t("CommunitySignalForm.successMessage") });
      onSent();
    } catch (e) {
      const status = e instanceof ApiError ? e.status : -1;
      setFeedback({
        ok: false,
        message:
          status === 0
            ? t("App.errors.offline")
            : status === 429
              ? t("App.rates.signalRateLimited")
              : status === 422
                ? t("App.rates.signalOutlier")
                : t("CommunitySignalForm.genericError"),
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t("Home.signalTitle")}</Text>
      <Text style={styles.muted}>{t("Home.signalSubtitle")}</Text>
      {signals && signals.count > 0 ? (
        <Text style={styles.median}>
          {t("Home.communityMedianPrefix")} {signals.median !== null ? `${formatNumber(signals.median, 2)} HTG` : "—"}
          {"  "}
          <Text style={styles.mutedInline}>
            {t("CommunitySignalForm.recentCount", { count: signals.count })} {t("Home.unverifiedData")}
          </Text>
        </Text>
      ) : (
        <Text style={styles.muted}>{t("CommunitySignalForm.beFirst")}</Text>
      )}
      <TextInput
        value={rate}
        onChangeText={(text) => setRate(text.replace(/[^0-9.,]/g, "").slice(0, 8))}
        keyboardType="decimal-pad"
        placeholder={t("CommunitySignalForm.rateLabel")}
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
      />
      <View style={styles.inputRow}>
        <TextInput
          value={amount}
          onChangeText={(text) => setAmount(text.replace(/[^0-9.,]/g, "").slice(0, 10))}
          keyboardType="decimal-pad"
          placeholder={t("CommunitySignalForm.amountLabel")}
          placeholderTextColor={Colors.textMuted}
          style={[styles.input, { flex: 1 }]}
        />
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder={t("CommunitySignalForm.locationLabel")}
          placeholderTextColor={Colors.textMuted}
          style={[styles.input, { flex: 1 }]}
          maxLength={120}
        />
      </View>
      <Pressable
        onPress={send}
        disabled={sending}
        style={[styles.button, sending && { opacity: 0.6 }]}
        android_ripple={{ color: "rgba(255,255,255,0.25)" }}
      >
        {sending ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>{t("CommunitySignalForm.submit")}</Text>
        )}
      </Pressable>
      {feedback && (
        <Text style={{ color: feedback.ok ? "#15803D" : Colors.error, fontSize: 14 }}>{feedback.message}</Text>
      )}
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
  updated: { fontSize: 12, color: Colors.textMuted },
  warning: { flexDirection: "row", gap: 8, backgroundColor: "#FEF3C7", borderRadius: 12, padding: 10 },
  warningText: { flex: 1, fontSize: 13, color: "#92400E" },
  tiles: { flexDirection: "row", gap: 10 },
  tile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEEEE8",
    gap: 2,
  },
  tileMain: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tileLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: "600" },
  tileLabelMain: { color: "rgba(255,255,255,0.85)" },
  tileValue: { fontSize: 24, fontWeight: "800", color: Colors.text },
  tileValueMain: { color: "#FFFFFF" },
  tileUnit: { fontSize: 11, color: Colors.textMuted },
  spreadRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  spreadLabel: { fontSize: 14, color: Colors.textLight },
  spreadValue: { fontSize: 15, fontWeight: "800", color: Colors.secondary },
  cross: { fontSize: 13, color: Colors.textMuted, paddingHorizontal: 4 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#EEEEE8",
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: Colors.text },
  segment: { flexDirection: "row", backgroundColor: Colors.surfaceMuted, borderRadius: 12, padding: 3 },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 10 },
  segmentItemActive: { backgroundColor: Colors.surface },
  segmentText: { fontSize: 13, fontWeight: "600", color: Colors.textMuted },
  segmentTextActive: { color: Colors.primary },
  muted: { fontSize: 13, color: Colors.textMuted, lineHeight: 19 },
  mutedInline: { fontSize: 12, color: Colors.textMuted },
  converterRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  amountBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  amountInput: { flex: 1, fontSize: 18, fontWeight: "700", paddingVertical: 10, color: Colors.text },
  amountCurrency: { fontSize: 13, fontWeight: "700", color: Colors.textMuted },
  swap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary50,
    alignItems: "center",
    justifyContent: "center",
  },
  resultBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  resultValue: { flex: 1, fontSize: 18, fontWeight: "800", color: Colors.primary },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quick: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  quickText: { fontSize: 13, color: Colors.text },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
  },
  inputRow: { flexDirection: "row", gap: 8 },
  verdict: { borderRadius: 12, padding: 12, gap: 4 },
  verdictGood: { backgroundColor: "#DCFCE7" },
  verdictBad: { backgroundColor: "#FEE2E2" },
  verdictTitle: { fontSize: 15, fontWeight: "800" },
  verdictText: { fontSize: 13, color: Colors.textLight },
  median: { fontSize: 15, fontWeight: "700", color: Colors.text },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: "center",
    overflow: "hidden",
  },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  sources: { fontSize: 11, color: Colors.textMuted, textAlign: "center", lineHeight: 16 },
});
