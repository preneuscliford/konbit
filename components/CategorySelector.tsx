import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { KonbitCategory } from "@/types/konbitTypes";

export const KONBIT_CATEGORIES: {
  key: KonbitCategory;
  label: string;
  icon: string;
  color: string;
}[] = [
  { key: "aide", label: "Aide", icon: "hand-heart", color: "#F97316" },
  {
    key: "projet",
    label: "Projet",
    icon: "rocket-launch-outline",
    color: "#0D9488",
  },
  {
    key: "idee",
    label: "Idée",
    icon: "lightbulb-on-outline",
    color: "#F59E0B",
  },
  {
    key: "evenement",
    label: "Événement",
    icon: "calendar-star",
    color: "#6366F1",
  },
  {
    key: "action_locale",
    label: "Action locale",
    icon: "map-marker-radius-outline",
    color: "#22C55E",
  },
  {
    key: "collecte",
    label: "Collecte",
    icon: "hand-coin-outline",
    color: "#EAB308",
  },
  {
    key: "mission",
    label: "Mission",
    icon: "flag-checkered",
    color: "#EC4899",
  },
  {
    key: "discussion",
    label: "Discussion",
    icon: "forum-outline",
    color: "#6B7280",
  },
];

export const getCategoryConfig = (category?: string) =>
  KONBIT_CATEGORIES.find((c) => c.key === category) || KONBIT_CATEGORIES[0];

interface Props {
  selected: KonbitCategory;
  onSelect: (category: KonbitCategory) => void;
}

const CategorySelector = ({ selected, onSelect }: Props) => {
  return (
    <View style={styles.row}>
      {KONBIT_CATEGORIES.map((c) => {
        const active = selected === c.key;
        return (
          <TouchableOpacity
            key={c.key}
            style={[styles.chip, active && { backgroundColor: c.color }]}
            onPress={() => onSelect(c.key)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={c.icon as any}
              size={18}
              color={active ? "#FFFFFF" : c.color}
            />
            <Text style={[styles.label, active && { color: "#FFFFFF" }]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F0EB",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A2E",
  },
});

export default CategorySelector;
