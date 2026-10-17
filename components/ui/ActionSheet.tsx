import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "@/constants/Colors";
import { Text } from "@/components/ui/Text";
import { useI18n } from "@/lib/i18n";

export interface SheetOption {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

// Petite feuille d'actions en bas d'écran (Alert d'Android est limité à 3 boutons).
export default function ActionSheet({
  visible,
  title,
  options,
  onClose,
}: {
  visible: boolean;
  title?: string;
  options: SheetOption[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t("App.cancel")}>
        <SafeAreaView edges={["bottom"]} style={styles.sheet}>
          {/* Le Pressable intérieur empêche un appui dans la feuille de la fermer. */}
          <Pressable>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {options.map((option) => (
              <Pressable
                key={option.label}
                style={styles.option}
                android_ripple={{ color: "rgba(0,0,0,0.06)" }}
                onPress={() => {
                  onClose();
                  option.onPress();
                }}
              >
                <Text style={[styles.optionText, option.destructive && styles.destructive]}>{option.label}</Text>
              </Pressable>
            ))}
            <View style={styles.separator} />
            <Pressable style={styles.option} onPress={onClose} android_ripple={{ color: "rgba(0,0,0,0.06)" }}>
              <Text style={[styles.optionText, styles.cancel]}>{t("App.cancel")}</Text>
            </Pressable>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: { fontSize: 14, fontWeight: "600", color: Colors.textMuted, paddingHorizontal: 20, paddingVertical: 12 },
  option: { paddingHorizontal: 20, paddingVertical: 15 },
  optionText: { fontSize: 16, color: Colors.text },
  destructive: { color: Colors.secondary, fontWeight: "600" },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: "#E5E7EB", marginVertical: 4 },
  cancel: { fontWeight: "600", color: Colors.textMuted },
});
