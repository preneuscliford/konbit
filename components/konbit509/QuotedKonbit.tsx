import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import Colors from "@/constants/Colors";
import Avatar from "@/components/konbit509/Avatar";
import { Text } from "@/components/ui/Text";
import { formatRelative, useI18n } from "@/lib/i18n";
import { mediaUrl, type KonbitOriginal } from "@/lib/konbits";
import { formatKonbitRange } from "@/lib/konbitTime";

// Publication d'origine sous un repost avec légende (ou en aperçu dans
// l'écran de repost) : version compacte ; un toucher l'ouvre.
export default function QuotedKonbit({ original, disabled = false }: { original: KonbitOriginal | null; disabled?: boolean }) {
  const { t, language } = useI18n();
  const router = useRouter();

  if (!original) {
    return (
      <View style={[styles.box, styles.missing]}>
        <Text style={styles.missingText}>{t("App.repost.unavailable")}</Text>
      </View>
    );
  }

  const name = original.author_name || original.author_pseudo || "…";
  const image = original.media?.find((m) => m.type === "image");
  const isKonbit = original.kind === "konbit" && !!original.title;

  return (
    <Pressable
      disabled={disabled}
      onPress={() => router.push({ pathname: "/konbit/[id]", params: { id: String(original.id) } })}
      style={styles.box}
      android_ripple={{ color: Colors.ripple }}
      accessibilityRole="link"
    >
      <View style={styles.head}>
        <Avatar
          pseudo={original.author_pseudo}
          name={original.author_name}
          avatarPath={original.author_avatar}
          seed={original.author_id}
          size={20}
        />
        <Text style={styles.name} numberOfLines={1}>
          {name}
          <Text style={styles.meta}> · {formatRelative(original.created_at, language)}</Text>
        </Text>
      </View>
      {isKonbit && (
        <>
          <Text style={styles.konbitBadge}>{t("App.kinds.konbit")}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {original.title}
          </Text>
          {original.starts_at && original.ends_at && (
            <Text style={styles.meta} numberOfLines={1}>
              🗓 {formatKonbitRange(original.starts_at, original.ends_at, language)}
            </Text>
          )}
        </>
      )}
      <View style={styles.row}>
        <Text style={styles.body} numberOfLines={3}>
          {original.body}
        </Text>
        {image && <Image source={{ uri: mediaUrl(image.path) }} style={styles.thumb} contentFit="cover" />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 10,
    gap: 4,
    marginTop: 4,
    overflow: "hidden",
  },
  missing: { backgroundColor: Colors.surfaceMuted },
  missingText: { fontSize: 13, color: Colors.textMuted },
  head: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { flex: 1, fontSize: 13, fontWeight: "700", color: Colors.text },
  meta: { fontSize: 12, fontWeight: "400", color: Colors.textMuted },
  konbitBadge: { fontSize: 10, fontWeight: "800", color: Colors.primary, textTransform: "uppercase" },
  title: { fontSize: 15, fontWeight: "800", color: Colors.text },
  row: { flexDirection: "row", gap: 10 },
  body: { flex: 1, fontSize: 14, lineHeight: 20, color: Colors.textLight },
  thumb: { width: 60, height: 60, borderRadius: 10 },
});
