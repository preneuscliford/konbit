import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const POST_TYPES = [
  {
    key: "post",
    label: "Publication",
    icon: "text-box-outline",
    color: "#0D9488",
  },
  {
    key: "help",
    label: "Demande d'aide",
    icon: "hand-heart",
    color: "#F97316",
  },
  { key: "announce", label: "Annonce", icon: "bullhorn", color: "#6366F1" },
  { key: "event", label: "Événement", icon: "calendar-star", color: "#EC4899" },
];

interface Props {
  selected: string;
  onSelect: (type: string) => void;
}

const CreateTypeSelector = ({ selected, onSelect }: Props) => {
  return (
    <View style={styles.row}>
      {POST_TYPES.map((t) => {
        const active = selected === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            style={[styles.chip, active && { backgroundColor: t.color }]}
            onPress={() => onSelect(t.key)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={t.icon as any}
              size={18}
              color={active ? "#FFFFFF" : t.color}
            />
            <Text style={[styles.label, active && { color: "#FFFFFF" }]}>
              {t.label}
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

export default CreateTypeSelector;
