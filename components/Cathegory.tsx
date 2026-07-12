import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { useRouter } from "expo-router";

const categories = [
  { id: "1", name: "Nettoyage", icon: "broom", color: "#0D9488" },
  { id: "2", name: "Réparation", icon: "wrench", color: "#F97316" },
  { id: "3", name: "Peinture", icon: "format-paint", color: "#6366F1" },
  { id: "4", name: "Déménagement", icon: "truck", color: "#8B5CF6" },
  { id: "5", name: "Jardinage", icon: "tree", color: "#10B981" },
  { id: "6", name: "Plomberie", icon: "water-pump", color: "#EF4444" },
  { id: "7", name: "Électricité", icon: "flash", color: "#F59E0B" },
  { id: "8", name: "Décoration", icon: "palette", color: "#EC4899" },
];

const ICON_SIZE = 56;
const ICON_INNER = 24;

const Categories = () => {
  const router = useRouter();

  const handleCategoryPress = (categoryId: string) => {
    router.push({
      pathname: "/services/category/[id]",
      params: { id: categoryId },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Catégories</Text>
      </View>

      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.category}
            onPress={() => handleCategoryPress(item.id)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: `${item.color}18` },
              ]}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={ICON_INNER}
                color={item.color}
              />
            </View>
            <Text style={styles.categoryName} numberOfLines={1}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  list: {
    paddingLeft: 16,
    paddingRight: 8,
    gap: 14,
  },
  category: {
    alignItems: "center",
    width: 70,
  },
  iconContainer: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
    textAlign: "center",
  },
});

export default Categories;
