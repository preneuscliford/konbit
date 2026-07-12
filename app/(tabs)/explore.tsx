import React from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import SearchInput from "@/components/SearchInput";
import Categories from "@/components/Cathegory";
import DisplayEvents from "@/components/DisplayEvent";
import LastItems from "@/components/LastItems";
import { fetchEvents } from "@/lib/homeService";
import { StatusBar } from "expo-status-bar";

const Explore = () => {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(
    null,
  );

  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <TouchableOpacity style={styles.filterButton}>
          <MaterialCommunityIcons
            name="filter-variant"
            size={24}
            color="#333"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <SearchInput />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <Categories />
        </View>

        {events && events.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Événements à venir</Text>
              <TouchableOpacity onPress={() => router.push("/events/all")}>
                <Text style={styles.viewAll}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            <DisplayEvents />
          </View>
        )}

        <View style={[styles.section, styles.lastSection]}>
          <LastItems />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8FD",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: wp("4%"),
    paddingTop: hp("1%"),
    paddingBottom: hp("1%"),
  },
  title: {
    fontSize: hp("2.5%"),
    fontWeight: "700",
    color: "#333",
  },
  filterButton: {
    padding: wp("2%"),
    backgroundColor: "#F3F4F6",
    borderRadius: wp("2%"),
  },
  searchContainer: {
    paddingHorizontal: wp("4%"),
    marginVertical: hp("1%"),
    zIndex: 1000,
  },
  scrollContent: {
    paddingBottom: hp("2%"),
  },
  section: {
    marginTop: hp("2%"),
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: wp("4%"),
    marginBottom: hp("1%"),
  },
  sectionTitle: {
    fontSize: hp("2%"),
    fontWeight: "600",
    color: "#1F2937",
  },
  viewAll: {
    fontSize: hp("1.6%"),
    color: "#9333EA",
    fontWeight: "500",
  },
  lastSection: {
    marginBottom: hp("2%"),
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: hp("2%"),
  },
  serviceCard: {
    backgroundColor: "#fff",
    borderRadius: wp("3%"),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  imageContainer: {
    height: hp("15%"),
    width: "100%",
  },
  serviceImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  serviceInfo: {
    padding: wp("3%"),
  },
  serviceHeader: {
    marginBottom: hp("1%"),
  },
  serviceName: {
    fontSize: hp("2%"),
    fontWeight: "600",
    color: "#333",
    marginBottom: hp("0.5%"),
  },
  serviceLocation: {
    fontSize: hp("1.6%"),
    color: "#666",
  },
  serviceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: hp("1%"),
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("1%"),
  },
  rating: {
    fontSize: hp("1.6%"),
    color: "#333",
    fontWeight: "500",
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingVertical: hp("0.8%"),
    paddingHorizontal: wp("4%"),
    borderRadius: wp("1.5%"),
    gap: wp("2%"),
  },
  callText: {
    color: "#fff",
    fontSize: hp("1.6%"),
    fontWeight: "500",
  },
});

export default Explore;
