import {
  ScrollView,
  View,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Slider from "@/components/Slider";
import { ActivityIndicator, Badge, Card, Chip, Text } from "react-native-paper";
import LastItems from "@/components/LastItems";
import ProductsImage from "@/components/ProductsImage";
import Cathegory from "@/components/Cathegory";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import DisplayEvents from "@/components/DisplayEvent";
import EventItem from "@/components/EventItem";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { useQueryClient } from "@tanstack/react-query";

interface Product {
  id: number;
  title: string;
  desc: string;
  price: string;
  imageUrl: string;
  category: string;
  created_at: string;
}

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Fonction de rafraîchissement

  const fetchData = async () => {
    try {
      // Implémentez votre logique de chargement ici
      const { data: products } = await supabase.from("products").select("*");
      const { data: categories } = await supabase
        .from("categories")
        .select("*");
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      // Invalider toutes les queries pertinentes
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["services"] }),
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["getProfile"] }),
      ]);
    } catch (error) {
      console.error("Erreur lors du rafraîchissement:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // if (loading) {
  //   return (
  //     <View className="flex-1 justify-center items-center bg-ghost-white">
  //       <StatusBar style="light" backgroundColor="#9333EA" />
  //       <ActivityIndicator style={{ flex: 1 }} />
  //     </View>
  //   );
  // }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#9333EA" />
      <View>
        <ScrollView
          horizontal={false}
          scrollEnabled={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#9333EA"
              colors={["#9333EA"]}
              progressBackgroundColor="#F5F8FD"
            />
          }
        >
          {/* En-tête avec recherche et profil */}
          <Header />

          {/* Section des catégories */}
          <View style={{ marginTop: 20, marginBottom: 10 }}>
            <Text
              style={{
                paddingHorizontal: 15,
                fontSize: hp("2%"),
                fontWeight: "bold",
                letterSpacing: 1,
                color: "#1A1A1A",
              }}
            >
              Nos Meilleurs offres
            </Text>
            <Slider />
          </View>
          <Cathegory />

          <LastItems />

          {/* Événements à venir */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Événements</Text>
            <Text style={styles.seeAll}>Voir tout</Text>
          </View>
          <View style={{ marginHorizontal: 8 }}>
            <DisplayEvents />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8FD",
  },
  promoBanner: {
    backgroundColor: "#007AFF",
    marginHorizontal: 20,
    marginVertical: 15,
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  promoText: {
    color: "white",
    fontSize: hp("2%"),
    fontWeight: "bold",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: hp("2%"),
    fontWeight: "bold",
    color: "#1A1A1A",
    letterSpacing: 1,
  },
  seeAll: {
    color: "#007AFF",
    fontSize: hp("1.2%"),
    fontWeight: "500",
    letterSpacing: 1,
  },
});
