import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Burnt from "burnt";
import { Ellipsis, Handshake, Heart, MessageCircle } from "lucide-react-native";
import Colors from "@/constants/Colors";
import Avatar from "@/components/konbit509/Avatar";
import KonbitImages from "@/components/konbit509/KonbitImages";
import ActionSheet, { type SheetOption } from "@/components/ui/ActionSheet";
import { Text } from "@/components/ui/Text";
import { useAccountGate, useCommuneName } from "@/hooks/useAccountGate";
import { useLike, useParticipation } from "@/hooks/useKonbits";
import { useAuth } from "@/lib/auth";
import { formatRelative, useI18n } from "@/lib/i18n";
import { ABUSE_REASONS, deleteKonbit, KonbitError, reportAbuse, type Konbit } from "@/lib/konbits";

// Carte d'un konbit dans le fil, composition inspirée de X : avatar à
// gauche ; à droite le pseudo suivi de la commune et de la date, le texte,
// les images et les actions (réponses, J'aime, Mwen ladan).
export default function KonbitCard({ konbit, detailed = false }: { konbit: Konbit; detailed?: boolean }) {
  const { t, language } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const requireAccount = useAccountGate();
  const communeName = useCommuneName();
  const participation = useParticipation();
  const like = useLike();
  const [sheet, setSheet] = useState<"menu" | "report" | null>(null);

  const isMine = konbit.author_id === userId;
  const errorText = (e: unknown) => t(`App.konbitErrors.${e instanceof KonbitError ? e.code : "failed"}`);

  function toggleJoin() {
    requireAccount(() =>
      participation.mutate(
        { konbit, on: !konbit.joined },
        { onError: (e) => Burnt.toast({ title: errorText(e), preset: "error" }) },
      ),
    );
  }

  function toggleLike() {
    requireAccount(() =>
      like.mutate(
        { konbit, on: !konbit.liked },
        { onError: (e) => Burnt.toast({ title: errorText(e), preset: "error" }) },
      ),
    );
  }

  function confirmDelete() {
    Alert.alert(t("App.card.delete"), t("App.card.deleteConfirm"), [
      { text: t("App.cancel"), style: "cancel" },
      {
        text: t("App.card.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteKonbit(konbit.id);
            await queryClient.invalidateQueries({ queryKey: ["konbits"] });
            if (detailed) router.back();
          } catch (e) {
            Burnt.toast({ title: errorText(e), preset: "error" });
          }
        },
      },
    ]);
  }

  async function sendReport(reason: (typeof ABUSE_REASONS)[number]) {
    try {
      await reportAbuse("konbit", konbit.id, reason);
      Burnt.toast({ title: t("App.card.reportThanks"), preset: "done" });
    } catch (e) {
      // Déjà signalé par ce compte : on remercie quand même, rien à corriger.
      if (e instanceof KonbitError && e.code === "already_done") {
        Burnt.toast({ title: t("App.card.reportThanks"), preset: "done" });
      } else {
        Burnt.toast({ title: errorText(e), preset: "error" });
      }
    }
  }

  const menuOptions: SheetOption[] = isMine
    ? [{ label: t("App.card.delete"), onPress: confirmDelete, destructive: true }]
    : [{ label: t("App.card.reportAbuse"), onPress: () => requireAccount(() => setSheet("report")) }];

  const reportOptions: SheetOption[] = ABUSE_REASONS.map((reason) => ({
    label: t(`App.abuse.${reason}`),
    onPress: () => sendReport(reason),
  }));

  const open = () => router.push({ pathname: "/konbit/[id]", params: { id: String(konbit.id) } });
  // Photo ou nom de l'auteur : sa page de profil.
  const openAuthor = () => router.push({ pathname: "/user/[id]", params: { id: konbit.author_id } });

  return (
    <Pressable onPress={detailed ? undefined : open} style={styles.card} android_ripple={detailed ? undefined : { color: "rgba(0,0,0,0.04)" }}>
      <Pressable onPress={openAuthor} hitSlop={4} accessibilityRole="link">
        <Avatar
          pseudo={konbit.author_pseudo}
          name={konbit.author_name}
          avatarPath={konbit.author_avatar}
          seed={konbit.author_id}
        />
      </Pressable>
      <View style={styles.main}>
        <View style={styles.metaRow}>
          <Text style={styles.identity} numberOfLines={1}>
            <Text style={styles.pseudo} onPress={openAuthor}>
              {konbit.author_name || konbit.author_pseudo || "…"}
            </Text>
            <Text style={styles.meta}>
              {"  "}
              {communeName(konbit.commune_slug)} · {formatRelative(konbit.created_at, language)}
            </Text>
          </Text>
          <Pressable
            onPress={() => setSheet("menu")}
            hitSlop={12}
            style={styles.menuButton}
            accessibilityLabel={t("App.card.menu")}
          >
            <Ellipsis size={18} color={Colors.textMuted} />
          </Pressable>
        </View>

        {/* Diskisyon est le type par défaut : seul Lide / Pwojè est signalé. */}
        {konbit.kind !== "discussion" && (
          <View style={[styles.kindBadge, konbit.kind === "project" && styles.kindProject]}>
            <Text style={[styles.kindText, konbit.kind === "project" && styles.kindTextProject]}>
              {t(`App.kinds.${konbit.kind}`)}
            </Text>
          </View>
        )}

        <Text style={[styles.body, detailed && styles.bodyDetailed]}>{konbit.body}</Text>

        <KonbitImages media={konbit.media ?? []} />

        <View style={styles.actions}>
          <Pressable
            onPress={open}
            style={styles.action}
            hitSlop={8}
            accessibilityLabel={`${t("App.card.replies")} ${konbit.reply_count}`}
          >
            <MessageCircle size={18} color={Colors.textMuted} />
            <Text style={styles.actionText}>{konbit.reply_count}</Text>
          </Pressable>

          <Pressable
            onPress={toggleLike}
            style={styles.action}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("App.card.like")}
            accessibilityState={{ selected: konbit.liked }}
          >
            <Heart
              size={18}
              color={konbit.liked ? Colors.secondary : Colors.textMuted}
              fill={konbit.liked ? Colors.secondary : "transparent"}
            />
            <Text style={[styles.actionText, konbit.liked && styles.likedText]}>{konbit.like_count ?? 0}</Text>
          </Pressable>

          {/* "Mwen ladan" remplace le "J'aime" de X. */}
          <Pressable
            onPress={toggleJoin}
            style={[styles.join, konbit.joined && styles.joinActive]}
            android_ripple={{ color: "rgba(0,32,159,0.12)" }}
            accessibilityRole="button"
            accessibilityState={{ selected: konbit.joined }}
          >
            <Handshake size={17} color={konbit.joined ? "#FFFFFF" : Colors.primary} />
            <Text style={[styles.joinText, konbit.joined && styles.joinTextActive]}>
              {t("App.card.join")} · {konbit.participant_count}
            </Text>
          </Pressable>
        </View>
      </View>

      <ActionSheet visible={sheet === "menu"} options={menuOptions} onClose={() => setSheet(null)} />
      <ActionSheet
        visible={sheet === "report"}
        title={t("App.card.reportTitle")}
        options={reportOptions}
        onClose={() => setSheet(null)}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  main: { flex: 1, gap: 6 },
  metaRow: { flexDirection: "row", alignItems: "center" },
  identity: { flex: 1 },
  pseudo: { fontSize: 15, fontWeight: "700", color: Colors.text },
  meta: { fontSize: 13, color: Colors.textMuted },
  menuButton: { paddingLeft: 8 },
  kindBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  kindProject: { backgroundColor: Colors.primary50 },
  kindText: { fontSize: 12, fontWeight: "700", color: "#92400E" },
  kindTextProject: { color: Colors.primary },
  body: { fontSize: 15, lineHeight: 22, color: Colors.text },
  bodyDetailed: { fontSize: 18, lineHeight: 27 },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  action: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionText: { fontSize: 13, color: Colors.textMuted },
  likedText: { color: Colors.secondary, fontWeight: "700" },
  join: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: "hidden",
  },
  joinActive: { backgroundColor: Colors.primary },
  joinText: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  joinTextActive: { color: "#FFFFFF" },
});
