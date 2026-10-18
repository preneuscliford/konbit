import React, { useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Burnt from "burnt";
import { ArrowLeft, Ellipsis, Send } from "lucide-react-native";
import Colors from "@/constants/Colors";
import Avatar from "@/components/konbit509/Avatar";
import KonbitCard from "@/components/konbit509/KonbitCard";
import RestrictionBanner, { useRestriction } from "@/components/konbit509/RestrictionBanner";
import ActionSheet, { type SheetOption } from "@/components/ui/ActionSheet";
import { Text, TextInput } from "@/components/ui/Text";
import { useAccountGate } from "@/hooks/useAccountGate";
import { repliesKey, useKonbit, useReplies } from "@/hooks/useKonbits";
import { useAuth } from "@/lib/auth";
import { formatRelative, useI18n } from "@/lib/i18n";
import {
  ABUSE_REASONS,
  deleteReply,
  KONBIT_MAX_LENGTH,
  KonbitError,
  postReply,
  reportAbuse,
  type KonbitReply,
} from "@/lib/konbits";

// Un konbit et son fil de réponses.
export default function KonbitDetailScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const konbitId = Number(id);
  const konbit = useKonbit(konbitId);
  const replies = useReplies(konbitId);
  const queryClient = useQueryClient();
  const requireAccount = useAccountGate();
  const [draft, setDraft] = useState("");
  const restriction = useRestriction();
  const [sending, setSending] = useState(false);

  const errorText = (e: unknown) => t(`App.konbitErrors.${e instanceof KonbitError ? e.code : "failed"}`);

  async function send() {
    if (!draft.trim() || sending) return;
    requireAccount(async () => {
      setSending(true);
      try {
        await postReply(konbitId, draft);
        setDraft("");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: repliesKey(konbitId) }),
          queryClient.invalidateQueries({ queryKey: ["konbits", "feed"] }),
          queryClient.invalidateQueries({ queryKey: ["konbits", "one", konbitId] }),
        ]);
      } catch (e) {
        Burnt.toast({ title: errorText(e), preset: "error" });
      } finally {
        setSending(false);
      }
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel={t("App.close")}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>{t("App.detail.title")}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {konbit.isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
        ) : !konbit.data ? (
          <Text style={styles.empty}>{t("App.detail.notFound")}</Text>
        ) : (
          <FlatList
            data={replies.data ?? []}
            keyExtractor={(item) => String(item.id)}
            ListHeaderComponent={<KonbitCard konbit={konbit.data} detailed />}
            renderItem={({ item }) => <ReplyRow reply={item} konbitId={konbitId} />}
            ListEmptyComponent={
              replies.isLoading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />
              ) : (
                <Text style={styles.empty}>{t("App.detail.noReplies")}</Text>
              )
            }
            keyboardShouldPersistTaps="handled"
          />
        )}

        {konbit.data && restriction.blocked && (
          <View style={styles.restriction}>
            <RestrictionBanner message={restriction.message} />
          </View>
        )}
        {konbit.data && !restriction.blocked && (
          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={(text) => setDraft(text.slice(0, KONBIT_MAX_LENGTH))}
              placeholder={t("App.detail.replyPlaceholder")}
              placeholderTextColor={Colors.textMuted}
              maxLength={KONBIT_MAX_LENGTH}
              multiline
              style={styles.input}
            />
            <Pressable
              onPress={send}
              disabled={!draft.trim() || sending}
              style={[styles.send, (!draft.trim() || sending) && styles.sendDisabled]}
              accessibilityLabel={t("App.detail.send")}
            >
              {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Send size={18} color="#FFFFFF" />}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ReplyRow({ reply, konbitId }: { reply: KonbitReply; konbitId: number }) {
  const { t, language } = useI18n();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const requireAccount = useAccountGate();
  const [sheet, setSheet] = useState<"menu" | "report" | null>(null);
  const isMine = reply.author_id === userId;
  const router = useRouter();
  const openAuthor = () => router.push({ pathname: "/user/[id]", params: { id: reply.author_id } });

  const errorText = (e: unknown) => t(`App.konbitErrors.${e instanceof KonbitError ? e.code : "failed"}`);

  async function remove() {
    try {
      await deleteReply(reply.id);
      await queryClient.invalidateQueries({ queryKey: repliesKey(konbitId) });
      await queryClient.invalidateQueries({ queryKey: ["konbits", "feed"] });
    } catch (e) {
      Burnt.toast({ title: errorText(e), preset: "error" });
    }
  }

  async function report(reason: (typeof ABUSE_REASONS)[number]) {
    try {
      await reportAbuse("reply", reply.id, reason);
      Burnt.toast({ title: t("App.card.reportThanks"), preset: "done" });
    } catch (e) {
      if (e instanceof KonbitError && e.code === "already_done") {
        Burnt.toast({ title: t("App.card.reportThanks"), preset: "done" });
      } else {
        Burnt.toast({ title: errorText(e), preset: "error" });
      }
    }
  }

  const menu: SheetOption[] = isMine
    ? [{ label: t("App.card.delete"), onPress: remove, destructive: true }]
    : [{ label: t("App.card.reportAbuse"), onPress: () => requireAccount(() => setSheet("report")) }];

  return (
    <View style={styles.reply}>
      <Pressable onPress={openAuthor} hitSlop={4}>
        <Avatar
          pseudo={reply.author?.pseudo ?? null}
          name={reply.author?.display_name}
          avatarPath={reply.author?.avatar_path}
          seed={reply.author_id}
          size={32}
        />
      </Pressable>
      <View style={{ flex: 1 }}>
        <View style={styles.replyMeta}>
          <Text style={styles.replyPseudo} onPress={openAuthor}>
            {reply.author?.display_name || reply.author?.pseudo || "…"}
          </Text>
          <Text style={styles.replyTime}> · {formatRelative(reply.created_at, language)}</Text>
          <Pressable onPress={() => setSheet("menu")} hitSlop={12} style={{ marginLeft: "auto" }} accessibilityLabel={t("App.card.menu")}>
            <Ellipsis size={16} color={Colors.textMuted} />
          </Pressable>
        </View>
        <Text style={styles.replyBody}>{reply.body}</Text>
      </View>
      <ActionSheet visible={sheet === "menu"} options={menu} onClose={() => setSheet(null)} />
      <ActionSheet
        visible={sheet === "report"}
        title={t("App.card.reportTitle")}
        options={ABUSE_REASONS.map((reason) => ({ label: t(`App.abuse.${reason}`), onPress: () => report(reason) }))}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  title: { fontSize: 18, fontWeight: "800", color: Colors.text },
  empty: { textAlign: "center", color: Colors.textMuted, padding: 24 },
  reply: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0F0EB",
  },
  replyMeta: { flexDirection: "row", alignItems: "center" },
  replyPseudo: { fontSize: 14, fontWeight: "700", color: Colors.text },
  replyTime: { fontSize: 13, color: Colors.textMuted },
  replyBody: { fontSize: 15, lineHeight: 21, color: Colors.text, marginTop: 2 },
  restriction: { padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E5E7EB" },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 15,
    color: Colors.text,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.4 },
});
