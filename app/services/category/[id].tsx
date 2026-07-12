import React from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBar } from "expo-status-bar";
import ServiceCard from "@/components/ServiceCard";

const CategoryPage = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const { data: services, isLoading } = useQuery({
    queryKey: ["services", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*, profiles(*), category_id(*)")
        .eq("category_id", id);

      if (error) throw error;
      return data;
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>
          {services?.[0]?.category_id?.name || "Catégorie"}
        </Text>
      </View>

      <FlatList
        data={services}
        renderItem={({ item }) => (
          <ServiceCard
            service={item}
            onPress={() => router.push(`/services/${item.id}` as any)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8FD",
  },
  header: {
    padding: wp("4%"),
  },
  title: {
    fontSize: hp("2.5%"),
    fontWeight: "700",
    color: "#1F2937",
  },
  listContent: {
    padding: wp("4%"),
    gap: hp("2%"),
  },
});

export default CategoryPage;
