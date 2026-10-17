import React, { useState } from "react";
import { Modal, Pressable, SectionList, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, ChevronDown, X } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { categoryMeta, INFO_CATEGORIES, SECURITY_CATEGORIES, UTILITY_CATEGORIES } from "@/lib/categories";
import { categoryLabel, useI18n } from "@/lib/i18n";

// Liste groupée comme le menu déroulant du web (konbit-report-form.tsx).
export default function CategoryPicker({ value, onChange }: { value: string; onChange: (category: string) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const sections = [
    { title: t("Konbit.categoryGroupInfo"), data: INFO_CATEGORIES },
    { title: t("Konbit.moduleUtility"), data: UTILITY_CATEGORIES },
    { title: `⚠️ ${t("Konbit.moduleSecurity")}`, data: SECURITY_CATEGORIES },
  ];

  function select(category: string) {
    onChange(category);
    setOpen(false);
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.trigger} accessibilityRole="button">
        <Text style={styles.triggerText} numberOfLines={1}>
          {categoryMeta(value).emoji} {categoryLabel(t, value)}
        </Text>
        <ChevronDown size={16} color={Colors.textMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modal} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("Konbit.categoryPlaceholder")}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12} accessibilityLabel={t("App.close")}>
              <X size={24} color={Colors.text} />
            </Pressable>
          </View>
          <SectionList
            sections={sections}
            keyExtractor={(item) => item}
            stickySectionHeadersEnabled
            renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
            renderItem={({ item }) => (
              <Pressable onPress={() => select(item)} style={styles.row}>
                <Text style={[styles.rowText, item === value && styles.rowTextSelected]}>
                  {categoryMeta(item).emoji} {categoryLabel(t, item)}
                </Text>
                {item === value && <Check size={18} color={Colors.primary} />}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
  },
  triggerText: { flex: 1, fontSize: 15, color: Colors.text },
  modal: { flex: 1, backgroundColor: Colors.surface },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: Colors.text },
  sectionTitle: {
    backgroundColor: Colors.surfaceWarm,
    paddingHorizontal: 16,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0F0EB",
  },
  rowText: { fontSize: 16, color: Colors.text },
  rowTextSelected: { color: Colors.primary, fontWeight: "700" },
});
