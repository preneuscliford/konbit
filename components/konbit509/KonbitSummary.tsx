import React from "react";
import { StyleSheet, View } from "react-native";
import { CalendarDays, MapPin, Users } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { Text } from "@/components/ui/Text";
import { useCommuneName } from "@/hooks/useAccountGate";
import { useNow } from "@/hooks/useNow";
import { useI18n } from "@/lib/i18n";
import { formatKonbitRange, konbitStatus, type KonbitStatus } from "@/lib/konbitTime";
import type { Konbit } from "@/lib/konbits";

const STATUS_COLORS: Record<KonbitStatus, { bg: string; fg: string }> = {
  upcoming: { bg: Colors.primary50, fg: Colors.primary },
  ongoing: { bg: Colors.successBg, fg: Colors.successText },
  ended: { bg: Colors.surfaceMuted, fg: Colors.textMuted },
};

export function useKonbitStatus(k: Pick<Konbit, "starts_at" | "ends_at">): KonbitStatus | null {
  const now = useNow();
  return k.starts_at && k.ends_at ? konbitStatus(k.starts_at, k.ends_at, now) : null;
}

// Nom, statut, dates, lieu et participants d'un konbit (action collective),
// puis son explication.
export default function KonbitSummary({ konbit: k, detailed = false }: { konbit: Konbit; detailed?: boolean }) {
  const { t, language } = useI18n();
  const communeName = useCommuneName();
  const status = useKonbitStatus(k);
  if (!k.title || !k.starts_at || !k.ends_at) return null;

  // L'organisateur fait partie du konbit.
  const members = k.participant_count + 1;
  const full = !!k.max_participants && members >= k.max_participants;

  return (
    <View style={styles.wrap}>
      <View style={styles.badges}>
        <View style={styles.konbitBadge}>
          <Text style={styles.konbitBadgeText}>{t("App.kinds.konbit")}</Text>
        </View>
        {status && (
          <View style={[styles.status, { backgroundColor: STATUS_COLORS[status].bg }]}>
            <Text style={[styles.statusText, { color: STATUS_COLORS[status].fg }]}>
              {t(`App.collectif.status.${status}`)}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.title, detailed && styles.titleDetailed]}>{k.title}</Text>

      <View style={styles.line}>
        <CalendarDays size={15} color={Colors.textMuted} />
        <Text style={styles.lineText}>{formatKonbitRange(k.starts_at, k.ends_at, language)}</Text>
      </View>
      <View style={styles.line}>
        <MapPin size={15} color={Colors.textMuted} />
        <Text style={styles.lineText}>
          {communeName(k.commune_slug)}
          {k.address_detail ? <Text style={styles.muted}> · {k.address_detail}</Text> : null}
        </Text>
      </View>
      <View style={styles.line}>
        <Users size={15} color={Colors.textMuted} />
        <Text style={styles.lineText}>
          {k.max_participants
            ? t("App.collectif.membersMax", { count: members, max: k.max_participants })
            : t("App.collectif.members", { count: members })}
          {full ? <Text style={styles.full}> · {t("App.collectif.full")}</Text> : null}
        </Text>
      </View>

      <Text style={[styles.body, detailed && styles.bodyDetailed]} numberOfLines={detailed ? undefined : 3}>
        {k.body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 5 },
  badges: { flexDirection: "row", gap: 6, alignItems: "center" },
  konbitBadge: { backgroundColor: Colors.primary, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  konbitBadgeText: { fontSize: 11, fontWeight: "800", color: Colors.textInverse, textTransform: "uppercase" },
  status: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: "700" },
  title: { fontSize: 17, fontWeight: "800", color: Colors.text, lineHeight: 23 },
  titleDetailed: { fontSize: 22, lineHeight: 29 },
  line: { flexDirection: "row", alignItems: "center", gap: 7 },
  lineText: { flex: 1, fontSize: 14, color: Colors.textLight },
  muted: { color: Colors.textMuted },
  full: { color: Colors.secondary, fontWeight: "700" },
  body: { fontSize: 15, lineHeight: 22, color: Colors.text, marginTop: 4 },
  bodyDetailed: { fontSize: 17, lineHeight: 26 },
});
