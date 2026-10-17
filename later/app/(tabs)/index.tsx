import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Header from "@/components/Header";
import KonbitCard from "@/components/KonbitCard";
import FeedTabSelector, { FeedTab } from "@/components/FeedTabSelector";
import { useAuth } from "../provider/AuthProvider";
import { useRouter } from "expo-router";
import { useKonbitFeed } from "@/hooks/useKonbitFeed";
import { StatusBar } from "expo-status-bar";
import Colors from "@/constants/Colors";

export default function HomeScreen() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FeedTab>("nouveaux");
  const [refreshing, setRefreshing] = useState(false);

  const feed = useKonbitFeed(activeTab, user?.id);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await feed.refetch();
    setRefreshing(false);
  }, [feed.refetch]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <FlatList
        data={feed.data}
        keyExtractor={(item: any) => String(item.id)}
        ListHeaderComponent={
          <>
            <Header />
            <TouchableOpacity
              style={styles.createBanner}
              onPress={() => router.push("/(tabs)/create")}
              activeOpacity={0.85}
            >
              <View style={styles.createBannerIcon}>
                <Feather name="plus" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.createBannerText}>Créer une Konbit</Text>
            </TouchableOpacity>
            <FeedTabSelector activeTab={activeTab} onChange={setActiveTab} />
          </>
        }
        ListEmptyComponent={
          feed.isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : feed.isError ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Erreur de chargement</Text>
              <Text style={styles.emptySub}>
                Impossible de charger les Konbits.
              </Text>
              <TouchableOpacity
                onPress={() => feed.refetch()}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {activeTab === "mesKonbits" && !user?.id
                  ? "Connectez-vous pour voir vos Konbits"
                  : "Aucune Konbit"}
              </Text>
              {activeTab !== "mesKonbits" && (
                <Text style={styles.emptySub}>
                  Soyez le premier à créer une Konbit dans votre communauté !
                </Text>
              )}
            </View>
          )
        }
        renderItem={({ item }) => (
          <KonbitCard
            item={item}
            currentUser={userData || user}
            router={router}
            showMoreIcons={true}
          />
        )}
        onEndReached={() => {
          if (feed.hasNextPage) feed.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          feed.isFetchingNextPage ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : !feed.hasNextPage && feed.data.length > 0 ? (
            <View style={styles.footerEnd}>
              <Text style={styles.footerEndText}>Fin des résultats</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceWarm },
  list: { paddingBottom: 20 },
  createBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.primary,
  },
  createBannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  createBannerText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  loading: { paddingTop: 80, alignItems: "center" },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 6,
    textAlign: "center",
  },
  emptySub: { fontSize: 14, color: Colors.textMuted, textAlign: "center" },
  retryButton: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: { color: "#FFFFFF", fontWeight: "600" },
  footerLoading: { paddingVertical: 16 },
  footerEnd: { paddingVertical: 16, alignItems: "center" },
  footerEndText: { color: Colors.textMuted },
});
