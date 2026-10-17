import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Colors from "@/constants/Colors";

export type ProfileTab = "crees" | "rejointes" | "enregistrees";

interface ProfileTabSelectorProps {
  tabs: { key: ProfileTab; label: string }[];
  activeTab: ProfileTab;
  onChange: (tab: ProfileTab) => void;
}

const ProfileTabSelector = ({
  tabs,
  activeTab,
  onChange,
}: ProfileTabSelectorProps) => {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.tabBarBorder,
    marginBottom: 8,
  },
  tab: {
    paddingBottom: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  labelActive: {
    color: Colors.primary,
  },
});

export default ProfileTabSelector;
