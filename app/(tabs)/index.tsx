import React, { useCallback, useState } from "react";
import { FlatList, View, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/Header";
import PostsCard from "@/components/PostsCard";
import { useAuth } from "../provider/AuthProvider";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Text } from "react-native-paper";
import { StatusBar } from "expo-status-bar";

export default function HomeScreen() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["feed-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles(*), post_likes(*), comments(*)")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    setRefreshing(false);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#0D9488" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <FlatList
        data={posts}
        keyExtractor={(item: any) => String(item.id)}
        ListHeaderComponent={<Header />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucune publication</Text>
            <Text style={styles.emptySub}>
              Soyez le premier à publier dans votre communauté !
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <PostsCard
            item={item}
            currentUser={userData || user}
            router={router}
            showMoreIcons={true}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0D9488"
            colors={["#0D9488"]}
          />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF5" },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAF5",
  },
  list: { paddingBottom: 20 },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 6,
  },
  emptySub: { fontSize: 14, color: "#9CA3AF", textAlign: "center" },
});
