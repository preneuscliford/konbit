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
import KonbitCard from "@/components/KonbitCard";
import { useAuth } from "../provider/AuthProvider";
import BackAppbar from "@/components/AppBar";
import { StatusBar } from "expo-status-bar";
import Colors from "@/constants/Colors";

export default function SearchQuery() {
  const { query } = useLocalSearchParams<{ query: string }>();
  const { userData, user } = useAuth();
  const router = useRouter();

  const searchTerm = query || "";

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", searchTerm],
    queryFn: async () => {
      const { data: konbits } = await supabase
        .from("konbits")
        .select(
          "*, profiles(*), konbit_participants(count), konbit_comments(count)",
        )
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order("created_at", { ascending: false })
        .limit(30);
      return konbits || [];
    },
    enabled: !!searchTerm,
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <BackAppbar title={searchTerm} />
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={({ item }) => (
            <KonbitCard
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
                Aucune Konbit trouvée pour "{searchTerm}"
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceWarm },
  list: { paddingTop: 8 },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 6,
  },
  emptySub: { fontSize: 14, color: Colors.textMuted, textAlign: "center" },
});
