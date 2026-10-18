import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import * as Burnt from "burnt";
import { Image } from "expo-image";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Ellipsis,
  Handshake,
  Heart,
  Megaphone,
  MessageCircle,
  ShieldAlert,
  UserPlus,
} from "lucide-react-native";
import Colors from "@/constants/Colors";
import Avatar from "@/components/konbit509/Avatar";
import ActionSheet from "@/components/ui/ActionSheet";
import { Text } from "@/components/ui/Text";
import { useDeleteNotification, useMarkAllRead, useNotifications } from "@/hooks/useSocial";
import { useAuth } from "@/lib/auth";
import { formatRelative, useI18n } from "@/lib/i18n";
import type { AppNotification } from "@/lib/social";

// Notifications dans l'app : activité des autres (konbit, abonné, J'aime,
// réponse, « Mwen ladan ») et messages de l'équipe (modération, annonces).
// Tout est marqué lu à l'ouverture de l'écran.

const AVATAR_SIZE = 44;
export default function NotificationsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { userId } = useAuth();
  const notifications = useNotifications();
  const markAllRead = useMarkAllRead();
  const [refreshing, setRefreshing] = useState(false);

  // Les points "non lu" restent visibles pendant cette visite, puis disparaissent.
  useEffect(() => {
    if (userId) markAllRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!userId) return <Redirect href="/account" />;

  async function onRefresh() {
    setRefreshing(true);
    await notifications.refetch();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel={t("App.close")}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>{t("App.notifications.title")}</Text>
      </View>

      <FlatList
        data={notifications.data ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <NotificationRow notification={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          notifications.isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
          ) : (
            <Text style={styles.empty}>{t("App.notifications.empty")}</Text>
          )
        }
      />
    </SafeAreaView>
  );
}

// Chaque notification peut être effacée de sa liste (bouton « … » ou appui long).
function NotificationRow({ notification: n }: { notification: AppNotification }) {
  const { t } = useI18n();
  const remove = useDeleteNotification();
  const [menu, setMenu] = useState(false);

  function erase() {
    setMenu(false);
    remove.mutate(n.id, {
      onError: () => Burnt.toast({ title: t("App.konbitErrors.failed"), preset: "error" }),
    });
  }

  const openMenu = () => setMenu(true);
  return (
    <>
      {n.type === "moderation" || n.type === "announcement" ? (
        <TeamNotificationRow notification={n} onMenu={openMenu} />
      ) : (
        <SocialNotificationRow notification={n} onMenu={openMenu} />
      )}
      <ActionSheet
        visible={menu}
        onClose={() => setMenu(false)}
        options={[{ label: t("App.notifications.delete"), onPress: erase, destructive: true }]}
      />
    </>
  );
}

function MenuButton({ onPress }: { onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.menuButton} accessibilityLabel={t("App.card.menu")}>
      <Ellipsis size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

// Avatar à gauche (auteur, ou logo Konbit 509 pour l'équipe) avec une pastille
// qui dit le type de notification.
function NotificationAvatar({ notification: n }: { notification: AppNotification }) {
  const m = n.moderation;
  const badge = (() => {
    switch (n.type) {
      case "new_like":
        return { Icon: Heart, color: Colors.secondary, fill: Colors.secondary };
      case "new_reply":
        return { Icon: MessageCircle, color: Colors.primary };
      case "new_participant":
        return { Icon: Handshake, color: Colors.success };
      case "new_follower":
        return { Icon: UserPlus, color: Colors.primary };
      case "new_konbit":
        return { Icon: Megaphone, color: Colors.primary };
      case "announcement":
        return { Icon: Bell, color: Colors.primary };
      default:
        return {
          Icon: ShieldAlert,
          color: m?.action === "lift" || m?.action === "restore_content" ? Colors.success : Colors.secondary,
        };
    }
  })();

  return (
    <View style={styles.avatarBox}>
      {n.type === "moderation" || n.type === "announcement" || !n.actor ? (
        <View style={styles.teamAvatar}>
          <Image source={require("@/assets/brand/logo.png")} style={styles.teamLogo} contentFit="contain" />
        </View>
      ) : (
        <Avatar
          pseudo={n.actor.pseudo}
          name={n.actor.display_name}
          avatarPath={n.actor.avatar_path}
          seed={n.actor.id}
          size={AVATAR_SIZE}
        />
      )}
      <View style={styles.badge}>
        <badge.Icon size={12} color={badge.color} fill={badge.fill ?? "transparent"} strokeWidth={2.5} />
      </View>
    </View>
  );
}

// Message de l'équipe Konbit 509 : décision de modération (texte complet ici)
// ou annonce (aperçu ; touchée, elle s'ouvre en entier). Pas de nom d'auteur.
function TeamNotificationRow({ notification: n, onMenu }: { notification: AppNotification; onMenu: () => void }) {
  const { t, language } = useI18n();
  const router = useRouter();
  const m = n.moderation;
  const isAnnouncement = n.type === "announcement";
  const until = m?.until
    ? new Date(m.until).toLocaleDateString(language === "fr" ? "fr-FR" : "fr-HT", { day: "numeric", month: "long" })
    : "";

  return (
    <Pressable
      onPress={
        isAnnouncement && n.announcement_id
          ? () => router.push({ pathname: "/announcement/[id]", params: { id: String(n.announcement_id) } })
          : undefined
      }
      onLongPress={onMenu}
      style={[styles.row, !n.read_at && styles.unread]}
      android_ripple={{ color: "rgba(0,0,0,0.04)" }}
    >
      <NotificationAvatar notification={n} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.text}>
          <Text style={styles.actor}>{t("App.notifications.team")}</Text>
          <Text style={styles.time}> · {formatRelative(n.created_at, language)}</Text>
        </Text>
        {isAnnouncement ? (
          <>
            <Text style={styles.headline}>{n.announcement?.title}</Text>
            <Text style={styles.message} numberOfLines={3}>
              {n.announcement?.body}
            </Text>
            <View style={styles.readMore}>
              <Text style={styles.readMoreText}>{t("App.notifications.readMore")}</Text>
              <ChevronRight size={14} color={Colors.primary} />
            </View>
          </>
        ) : m ? (
          <>
            <Text style={styles.message}>
              {t(`App.notifications.moderation.${m.action}`, {
                until,
                reason: m.reason ? t(`App.abuse.${m.reason}`) : "",
              })}
            </Text>
            {m.note && <Text style={styles.note}>« {m.note} »</Text>}
            {m.action !== "lift" && m.action !== "restore_content" && (
              <Text style={styles.snippet}>{t("App.notifications.moderation.help")}</Text>
            )}
          </>
        ) : null}
      </View>
      <MenuButton onPress={onMenu} />
    </Pressable>
  );
}

// Activité des autres : nouveau konbit, abonné, J'aime, réponse, « Mwen ladan ».
function SocialNotificationRow({ notification: n, onMenu }: { notification: AppNotification; onMenu: () => void }) {
  const { t, language } = useI18n();
  const router = useRouter();
  const actorName = n.actor?.display_name || n.actor?.pseudo || "…";
  const label = {
    new_konbit: t("App.notifications.newKonbit"),
    new_follower: t("App.notifications.newFollower"),
    new_like: t("App.notifications.newLike"),
    new_reply: t("App.notifications.newReply"),
    new_participant: t("App.notifications.newParticipant"),
  }[n.type as "new_konbit" | "new_follower" | "new_like" | "new_reply" | "new_participant"];
  // Réponse : on montre ce qui a été répondu ; sinon le konbit concerné.
  const snippet = n.type === "new_reply" ? n.reply?.body : n.type === "new_follower" ? null : n.konbit?.body;

  function open() {
    if (n.type !== "new_follower" && n.konbit_id) {
      router.push({ pathname: "/konbit/[id]", params: { id: String(n.konbit_id) } });
    } else if (n.actor) {
      router.push({ pathname: "/user/[id]", params: { id: n.actor.id } });
    }
  }

  return (
    <Pressable
      onPress={open}
      onLongPress={onMenu}
      style={[styles.row, !n.read_at && styles.unread]}
      android_ripple={{ color: "rgba(0,0,0,0.04)" }}
    >
      <Pressable
        onPress={() => n.actor && router.push({ pathname: "/user/[id]", params: { id: n.actor.id } })}
        hitSlop={4}
      >
        <NotificationAvatar notification={n} />
      </Pressable>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.text}>
          <Text style={styles.actor}>{actorName}</Text> {label}
          <Text style={styles.time}> · {formatRelative(n.created_at, language)}</Text>
        </Text>
        {snippet ? (
          <Text style={styles.snippet} numberOfLines={2}>
            {snippet}
          </Text>
        ) : null}
      </View>
      <MenuButton onPress={onMenu} />
    </Pressable>
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
  row: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0F0EB",
  },
  unread: { backgroundColor: Colors.primary50 },
  avatarBox: { width: AVATAR_SIZE, height: AVATAR_SIZE },
  teamAvatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  teamLogo: { width: 30, height: 28 },
  badge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  headline: { fontSize: 15, fontWeight: "800", color: Colors.text },
  text: { fontSize: 15, lineHeight: 21, color: Colors.text },
  actor: { fontWeight: "700" },
  time: { color: Colors.textMuted },
  snippet: { fontSize: 14, color: Colors.textMuted, lineHeight: 20 },
  message: { fontSize: 15, lineHeight: 21, color: Colors.text },
  note: { fontSize: 14, lineHeight: 20, color: Colors.textLight, fontStyle: "italic" },
  readMore: { flexDirection: "row", alignItems: "center", gap: 2 },
  readMoreText: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  menuButton: { paddingTop: 4 },
  empty: { textAlign: "center", color: Colors.textMuted, padding: 32 },
});
