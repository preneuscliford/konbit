import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import Colors from "@/constants/Colors";
import { LANGUAGES, useI18n } from "@/lib/i18n";

const SHORT: Record<string, string> = { ht: "KR", fr: "FR" };

export default function LanguageToggle() {
  const { language, setLanguage } = useI18n();

  return (
    <View style={styles.container}>
      {LANGUAGES.map((l) => {
        const active = l.code === language;
        return (
          <Pressable
            key={l.code}
            onPress={() => setLanguage(l.code)}
            style={[styles.option, active && styles.optionActive]}
            accessibilityRole="button"
            accessibilityLabel={l.label}
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.text, active && styles.textActive]}>{SHORT[l.code]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 16,
    padding: 3,
  },
  option: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 13 },
  optionActive: { backgroundColor: Colors.surface },
  text: { fontSize: 12, fontWeight: "700", color: Colors.textMuted },
  textActive: { color: Colors.primary },
});
