import React, { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Burnt from "burnt";
import { ArrowLeft, Ellipsis, Heart, MessageCircle, Send, X } from "lucide-react-native";
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
  fetchMyReplyLikes,
  KonbitError,
  postReply,
  reportAbuse,
  setReplyLike,
  type KonbitReply,
} from "@/lib/konbits";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardScroll";

// Longueur maximale d'un message ou d'une réponse (limite du serveur).
const REPLY_MAX = 500;

type Row = { reply: KonbitReply; depth: 0 | 1; parentId: number };

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
  const { userId, canPost } = useAuth();
  // Réponse en cours : sous quel message, en citant qui.
  const [replyTo, setReplyTo] = useState<{ parentId: number; name: string } | null>(null);
  // J'aime de l'utilisateur sur les messages, et changements faits ici.
  const replyIds = (replies.data ?? []).map((r) => r.id);
  const myLikes = useQuery({
    queryKey: ["konbits", "replyLikes", konbitId, userId, replyIds.length],
    queryFn: () => fetchMyReplyLikes(userId!, replyIds),
    enabled: !!userId && replyIds.length > 0,
  });
  const [likeChanges, setLikeChanges] = useState<Record<number, { liked: boolean; count: number }>>({});

  // Un message, puis ses réponses en retrait.
  const rows: Row[] = [];
  const all = replies.data ?? [];
  for (const top of all.filter((r) => r.parent_id === null)) {
    rows.push({ reply: top, depth: 0, parentId: top.id });
    for (const child of all.filter((r) => r.parent_id === top.id)) {
      rows.push({ reply: child, depth: 1, parentId: top.id });
    }
  }

  const isKonbit = konbit.data?.kind === "konbit";
  // Dans un konbit, seuls l'organisateur et les participants écrivent.
  const canWrite = !isKonbit || (canPost && (konbit.data?.author_id === userId || !!konbit.data?.joined));

  function startReply(row: Row) {
    requireAccount(() => {
      if (!canWrite) {
        Burnt.toast({ title: t("App.thread.membersOnly"), preset: "error" });
        return;
      }
      const name = row.reply.author?.pseudo ?? row.reply.author?.display_name ?? "";
      setReplyTo({ parentId: row.parentId, name });
      // Réponse à une réponse : on cite la personne.
      if (row.depth === 1 && row.reply.author?.pseudo) setDraft(`@${row.reply.author.pseudo} `);
    });
  }

  function toggleReplyLike(reply: KonbitReply) {
    requireAccount(async () => {
      const current = likeChanges[reply.id] ?? { liked: !!myLikes.data?.has(reply.id), count: reply.like_count };
      const next = { liked: !current.liked, count: Math.max(0, current.count + (current.liked ? -1 : 1)) };
      setLikeChanges((m) => ({ ...m, [reply.id]: next }));
      try {
        await setReplyLike(reply.id, userId!, next.liked);
      } catch (e) {
        setLikeChanges((m) => ({ ...m, [reply.id]: current }));
        Burnt.toast({ title: errorText(e), preset: "error" });
      }
    });
  }

  const errorText = (e: unknown) => t(`App.konbitErrors.${e instanceof KonbitError ? e.code : "failed"}`);

  async function send() {
    if (!draft.trim() || sending) return;
    requireAccount(async () => {
      setSending(true);
      try {
        await postReply(konbitId, draft, replyTo?.parentId ?? null);
        setDraft("");
        setReplyTo(null);
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {konbit.isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
        ) : !konbit.data ? (
          <Text style={styles.empty}>{t("App.detail.notFound")}</Text>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => String(item.reply.id)}
            ListHeaderComponent={
              <>
                <KonbitCard konbit={konbit.data} detailed />
                <Text style={styles.section}>{t(isKonbit ? "App.thread.messages" : "App.thread.replies")}</Text>
              </>
            }
            renderItem={({ item }) => {
              const like = likeChanges[item.reply.id] ?? {
                liked: !!myLikes.data?.has(item.reply.id),
                count: item.reply.like_count,
              };
              return (
                <ReplyRow
                  reply={item.reply}
                  depth={item.depth}
                  konbitId={konbitId}
                  liked={like.liked}
                  likeCount={like.count}
                  onLike={() => toggleReplyLike(item.reply)}
                  onReply={() => startReply(item)}
                />
              );
            }}
            ListEmptyComponent={
              replies.isLoading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />
              ) : (
                <Text style={styles.empty}>{t(isKonbit ? "App.thread.noMessages" : "App.detail.noReplies")}</Text>
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
        {konbit.data && !restriction.blocked && !canWrite && (
          <Text style={styles.membersOnly}>{t("App.thread.membersOnly")}</Text>
        )}
        {konbit.data && !restriction.blocked && canWrite && replyTo && (
          <View style={styles.replyingTo}>
            <Text style={styles.replyingToText} numberOfLines={1}>
              {t("App.thread.replyingTo", { name: replyTo.name })}
            </Text>
            <Pressable
              onPress={() => {
                setReplyTo(null);
                setDraft("");
              }}
              hitSlop={10}
              accessibilityLabel={t("App.thread.cancel")}
            >
              <X size={16} color={Colors.textMuted} />
            </Pressable>
          </View>
        )}
        {konbit.data && !restriction.blocked && canWrite && (
          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={(text) => setDraft(text.slice(0, REPLY_MAX))}
              placeholder={t(
                replyTo
                  ? "App.thread.replyPlaceholder"
                  : isKonbit
                    ? "App.thread.messagePlaceholder"
                    : "App.detail.replyPlaceholder",
              )}
              placeholderTextColor={Colors.textMuted}
              maxLength={REPLY_MAX}
              multiline
              style={styles.input}
            />
            <Pressable
              onPress={send}
              disabled={!draft.trim() || sending}
              style={[styles.send, (!draft.trim() || sending) && styles.sendDisabled]}
              accessibilityLabel={t("App.detail.send")}
            >
              {sending ? (
                <ActivityIndicator size="small" color={Colors.textInverse} />
              ) : (
                <Send size={18} color={Colors.textInverse} />
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ReplyRow({
  reply,
  depth,
  konbitId,
  liked,
  likeCount,
  onLike,
  onReply,
}: {
  reply: KonbitReply;
  depth: 0 | 1;
  konbitId: number;
  liked: boolean;
  likeCount: number;
  onLike: () => void;
  onReply: () => void;
}) {
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
    <View style={[styles.reply, depth === 1 && styles.replyNested]}>
      <Pressable onPress={openAuthor} hitSlop={4}>
        <Avatar
          pseudo={reply.author?.pseudo ?? null}
          name={reply.author?.display_name}
          avatarPath={reply.author?.avatar_path}
          seed={reply.author_id}
          size={depth === 1 ? 28 : 34}
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
        <View style={styles.replyActions}>
          <Pressable onPress={onReply} hitSlop={8} style={styles.replyAction} accessibilityRole="button">
            <MessageCircle size={15} color={Colors.textMuted} />
            <Text style={styles.replyActionText}>{t("App.thread.reply")}</Text>
          </Pressable>
          <Pressable
            onPress={onLike}
            hitSlop={8}
            style={styles.replyAction}
            accessibilityRole="button"
            accessibilityState={{ selected: liked }}
            accessibilityLabel={t("App.card.like")}
          >
            <Heart
              size={15}
              color={liked ? Colors.secondary : Colors.textMuted}
              fill={liked ? Colors.secondary : "transparent"}
            />
            {likeCount > 0 && <Text style={[styles.replyActionText, liked && styles.liked]}>{likeCount}</Text>}
          </Pressable>
        </View>
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
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 18, fontWeight: "800", color: Colors.text },
  empty: { textAlign: "center", color: Colors.textMuted, padding: 24 },
  reply: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSoft,
  },
  // Réponse sous un message : en retrait, sans séparateur.
  replyNested: { paddingLeft: 60, borderBottomWidth: 0, paddingVertical: 8 },
  replyMeta: { flexDirection: "row", alignItems: "center" },
  replyActions: { flexDirection: "row", gap: 20, marginTop: 6 },
  replyAction: { flexDirection: "row", alignItems: "center", gap: 5 },
  replyActionText: { fontSize: 13, color: Colors.textMuted, fontWeight: "600" },
  liked: { color: Colors.secondary },
  section: { fontSize: 16, fontWeight: "800", color: Colors.text, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  membersOnly: {
    margin: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.primary50,
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  replyingTo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  replyingToText: { flex: 1, fontSize: 13, color: Colors.primary, fontWeight: "600" },
  replyPseudo: { fontSize: 14, fontWeight: "700", color: Colors.text },
  replyTime: { fontSize: 13, color: Colors.textMuted },
  replyBody: { fontSize: 15, lineHeight: 21, color: Colors.text, marginTop: 2 },
  restriction: { padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
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
