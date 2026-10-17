import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import Colors from "@/constants/Colors";
import AppHeader from "@/components/AppHeader";
import OfflineBanner from "@/components/konbit/OfflineBanner";
import KonbitCard from "@/components/konbit509/KonbitCard";
import { Text } from "@/components/ui/Text";
import { useFeed } from "@/hooks/useKonbits";
import { useI18n } from "@/lib/i18n";

// Fil Konbit : écran d'ouverture de l'app.
export default function KonbitFeedScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const feed = useFeed();
  const [refreshing, setRefreshing] = useState(false);

  const konbits = useMemo(() => feed.data?.pages.flat() ?? [], [feed.data]);

  async function onRefresh() {
    setRefreshing(true);
    await feed.refetch();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <AppHeader />
      <OfflineBanner />

      <FlatList
        data={konbits}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <KonbitCard konbit={item} />}
        onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && feed.fetchNextPage()}
        onEndReachedThreshold={0.5}
        initialNumToRender={8}
        windowSize={7}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          feed.isLoading ? (
            <ActivityIndicator color={Colors.primary} style={styles.loader} />
          ) : feed.isError ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t("App.feed.loadError")}</Text>
              <Pressable onPress={() => feed.refetch()} style={styles.button}>
                <Text style={styles.buttonText}>{t("App.retry")}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t("App.feed.empty")}</Text>
              <Pressable onPress={() => router.push("/compose")} style={styles.button}>
                <Text style={styles.buttonText}>{t("App.compose.title")}</Text>
              </Pressable>
            </View>
          )
        }
        ListFooterComponent={
          feed.isFetchingNextPage ? (
            <ActivityIndicator color={Colors.primary} style={styles.loader} />
          ) : konbits.length > 0 && !feed.hasNextPage ? (
            <Text style={styles.end}>{t("App.feed.end")}</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  loader: { marginVertical: 24 },
  empty: { alignItems: "center", gap: 16, paddingHorizontal: 32, paddingTop: 64 },
  emptyText: { fontSize: 15, color: Colors.textMuted, textAlign: "center", lineHeight: 22 },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 11,
    overflow: "hidden",
  },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  end: { textAlign: "center", color: Colors.textMuted, fontSize: 13, paddingVertical: 24 },
});
