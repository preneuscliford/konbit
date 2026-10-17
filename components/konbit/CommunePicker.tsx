import React, { useMemo, useState } from "react";
import { Modal, Pressable, SectionList, StyleSheet, View } from "react-native";
import { Text, TextInput } from "@/components/ui/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, ChevronDown, MapPin, Search, X } from "lucide-react-native";
import Colors from "@/constants/Colors";
import type { KonbitCommune } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export const ALL_COMMUNES = "all";
const NATIONAL = "national";

const normalize = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface Props {
  communes: KonbitCommune[];
  value: string;
  onChange: (slug: string) => void;
  // Filtre du flux : propose "Toutes les communes". Formulaire : non.
  allowAll?: boolean;
  placeholder: string;
  compact?: boolean;
}

export function communeName(communes: KonbitCommune[], slug: string): string | undefined {
  const commune = communes.find((c) => c.slug === slug);
  if (!commune) return undefined;
  return commune.slug === NATIONAL ? `🇭🇹 ${commune.name}` : commune.name;
}

export default function CommunePicker({ communes, value, onChange, allowAll, placeholder, compact }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // "National" est épinglé en tête, hors du regroupement par département,
  // comme sur le web.
  const sections = useMemo(() => {
    const q = normalize(query.trim());
    const matches = (c: KonbitCommune) =>
      !q || normalize(c.name).includes(q) || normalize(c.department).includes(q);

    const pinned: { slug: string; label: string }[] = [];
    if (allowAll && !q) pinned.push({ slug: ALL_COMMUNES, label: t("Konbit.allCommunes") });
    const national = communes.find((c) => c.slug === NATIONAL);
    if (national && matches(national)) pinned.push({ slug: NATIONAL, label: `🇭🇹 ${national.name}` });

    const byDepartment = new Map<string, { slug: string; label: string }[]>();
    for (const c of communes) {
      if (c.slug === NATIONAL || !matches(c)) continue;
      const list = byDepartment.get(c.department) ?? [];
      list.push({ slug: c.slug, label: c.name });
      byDepartment.set(c.department, list);
    }

    return [
      ...(pinned.length ? [{ title: "", data: pinned }] : []),
      ...[...byDepartment.entries()].map(([title, data]) => ({ title, data })),
    ];
  }, [communes, query, allowAll, t]);

  const selectedLabel =
    value === ALL_COMMUNES ? t("Konbit.allCommunes") : communeName(communes, value) ?? placeholder;

  function select(slug: string) {
    onChange(slug);
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, compact && styles.triggerCompact]}
        accessibilityRole="button"
      >
        <MapPin size={16} color={Colors.primary} />
        <Text style={[styles.triggerText, !value && styles.placeholder]} numberOfLines={1}>
          {value ? selectedLabel : placeholder}
        </Text>
        <ChevronDown size={16} color={Colors.textMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modal} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <View style={styles.searchBox}>
              <Search size={18} color={Colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t("App.searchCommune")}
                placeholderTextColor={Colors.textMuted}
                style={styles.searchInput}
                autoCorrect={false}
              />
            </View>
            <Pressable onPress={() => setOpen(false)} hitSlop={12} accessibilityLabel={t("App.close")}>
              <X size={24} color={Colors.text} />
            </Pressable>
          </View>

          <SectionList
            sections={sections}
            keyExtractor={(item) => item.slug}
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled
            renderSectionHeader={({ section }) =>
              section.title ? <Text style={styles.sectionTitle}>{section.title}</Text> : null
            }
            renderItem={({ item }) => (
              <Pressable onPress={() => select(item.slug)} style={styles.row}>
                <Text style={[styles.rowText, item.slug === value && styles.rowTextSelected]}>{item.label}</Text>
                {item.slug === value && <Check size={18} color={Colors.primary} />}
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.empty}>{t("App.noCommuneFound")}</Text>}
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
  triggerCompact: { paddingVertical: 8, borderRadius: 20 },
  triggerText: { flex: 1, fontSize: 15, color: Colors.text },
  placeholder: { color: Colors.textMuted },
  modal: { flex: 1, backgroundColor: Colors.surface },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16, color: Colors.text },
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
  empty: { padding: 24, textAlign: "center", color: Colors.textMuted },
});
