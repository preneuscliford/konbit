import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import PostsCard from "@/components/PostsCard";
import { useAuth } from "../provider/AuthProvider";
import BackAppbar from "@/components/AppBar";
import { StatusBar } from "expo-status-bar";

export default function SearchQuery() {
  const { query } = useLocalSearchParams<{ query: string }>();
  const { userData, user } = useAuth();
  const router = useRouter();

  const searchTerm = (query || "").replace("#", "");

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", searchTerm],
    queryFn: async () => {
      const { data: posts } = await supabase
        .from("posts")
        .select("*, profiles(*), post_likes(*), comments(*)")
        .or(`content.ilike.%${searchTerm}%,content.ilike.%#${searchTerm}%`)
        .order("created_at", { ascending: false })
        .limit(30);
      return posts || [];
    },
    enabled: !!searchTerm,
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <BackAppbar title={`#${searchTerm}`} />
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#0D9488" />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={({ item }) => (
            <PostsCard
              item={item}
              currentUser={userData || user}
              router={router}
              showMoreIcons
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Aucun résultat</Text>
              <Text style={styles.emptySub}>
                Aucune publication trouvée pour #{searchTerm}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF5" },
  list: { paddingTop: 8 },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 6,
  },
  emptySub: { fontSize: 14, color: "#9CA3AF", textAlign: "center" },
});
