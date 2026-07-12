import { ScrollView, View, StyleSheet, RefreshControl } from "react-native";
import React, { useCallback, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/Header";
import Slider from "@/components/Slider";
import { Text } from "react-native-paper";
import Cathegory from "@/components/Cathegory";
import LastItems from "@/components/LastItems";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import DisplayEvents from "@/components/DisplayEvent";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import { useQueryClient } from "@tanstack/react-query";

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["services"] }),
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["getProfile"] }),
      ]);
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0D9488"
            colors={["#0D9488"]}
            progressBackgroundColor="#FFFFFF"
          />
        }
      >
        <Header />

        {/* Meilleures offres */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nos Meilleures Offres</Text>
          <Slider />
        </View>

        {/* Catégories */}
        <View style={styles.section}>
          <Cathegory />
        </View>

        {/* Derniers articles */}
        <LastItems />

        {/* Événements */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Événements</Text>
            <Text style={styles.seeAll}>Voir tout</Text>
          </View>
          <DisplayEvents />
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAF5",
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: hp("2%"),
    fontWeight: "700",
    color: "#1A1A2E",
  },
  seeAll: {
    color: "#0D9488",
    fontSize: hp("1.5%"),
    fontWeight: "600",
  },
});
