import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { ArrowLeft, Megaphone, UserPlus } from "lucide-react-native";
import Colors from "@/constants/Colors";
import Avatar from "@/components/konbit509/Avatar";
import { Text } from "@/components/ui/Text";
import { useMarkAllRead, useNotifications } from "@/hooks/useSocial";
import { useAuth } from "@/lib/auth";
import { formatRelative, useI18n } from "@/lib/i18n";
import type { AppNotification } from "@/lib/social";

// Notifications dans l'app : nouveau konbit d'une personne dont on a activé la
// cloche, nouvel abonné. Tout est marqué lu à l'ouverture de l'écran.
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

function NotificationRow({ notification: n }: { notification: AppNotification }) {
  const { t, language } = useI18n();
  const router = useRouter();
  const actorName = n.actor?.display_name || n.actor?.pseudo || "…";
  const isKonbit = n.type === "new_konbit";

  function open() {
    if (isKonbit && n.konbit_id) router.push({ pathname: "/konbit/[id]", params: { id: String(n.konbit_id) } });
    else if (n.actor) router.push({ pathname: "/user/[id]", params: { id: n.actor.id } });
  }

  return (
    <Pressable onPress={open} style={[styles.row, !n.read_at && styles.unread]} android_ripple={{ color: "rgba(0,0,0,0.04)" }}>
      <View style={styles.iconCol}>
        {isKonbit ? <Megaphone size={20} color={Colors.primary} /> : <UserPlus size={20} color={Colors.primary} />}
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        {n.actor && (
          <Avatar
            pseudo={n.actor.pseudo}
            name={n.actor.display_name}
            avatarPath={n.actor.avatar_path}
            seed={n.actor.id}
            size={32}
          />
        )}
        <Text style={styles.text}>
          <Text style={styles.actor}>{actorName}</Text>{" "}
          {isKonbit ? t("App.notifications.newKonbit") : t("App.notifications.newFollower")}
          <Text style={styles.time}> · {formatRelative(n.created_at, language)}</Text>
        </Text>
        {isKonbit && n.konbit?.body ? (
          <Text style={styles.snippet} numberOfLines={2}>
            {n.konbit.body}
          </Text>
        ) : null}
      </View>
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
  iconCol: { width: 28, alignItems: "flex-end", paddingTop: 6 },
  text: { fontSize: 15, lineHeight: 21, color: Colors.text },
  actor: { fontWeight: "700" },
  time: { color: Colors.textMuted },
  snippet: { fontSize: 14, color: Colors.textMuted, lineHeight: 20 },
  empty: { textAlign: "center", color: Colors.textMuted, padding: 32 },
});
