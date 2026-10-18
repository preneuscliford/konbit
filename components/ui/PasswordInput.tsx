import React, { useState } from "react";
import { Pressable, StyleSheet, View, type TextInputProps } from "react-native";
import { Check, Eye, EyeOff } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { Text, TextInput } from "@/components/ui/Text";
import { useI18n } from "@/lib/i18n";

export const MIN_PASSWORD = 8;

// Mots de passe trop courants : refusés comme "faibles" même s'ils sont longs.
const COMMON = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "87654321",
  "password",
  "password1",
  "motdepasse",
  "azertyuiop",
  "qwertyuiop",
  "konbit509",
  "haiti509",
  "ayiti509",
  "00000000",
  "11111111",
]);

type Strength = "short" | "weak" | "medium" | "strong";

export function passwordStrength(password: string): Strength {
  if (password.length < MIN_PASSWORD) return "short";
  if (COMMON.has(password.toLowerCase()) || /^(.)\1+$/.test(password)) return "weak";
  let score = 0;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score >= 3 ? "strong" : score === 2 ? "medium" : "weak";
}

const LEVEL: Record<Strength, { bars: number; color: string }> = {
  short: { bars: 0, color: Colors.error },
  weak: { bars: 1, color: Colors.error },
  medium: { bars: 2, color: Colors.warning },
  strong: { bars: 3, color: Colors.success },
};

interface Props extends Pick<TextInputProps, "placeholder" | "autoComplete" | "autoFocus"> {
  value: string;
  onChangeText: (text: string) => void;
  // Inscription / nouveau mot de passe : jauge de force + minimum requis.
  showStrength?: boolean;
}

// Champ mot de passe avec bouton œil (afficher / cacher) et, au besoin, la
// force du mot de passe pendant la saisie.
export default function PasswordInput({ value, onChangeText, showStrength, ...props }: Props) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const strength = passwordStrength(value);
  const level = LEVEL[strength];
  const longEnough = value.length >= MIN_PASSWORD;

  return (
    <View style={styles.wrapper}>
      <View style={styles.field}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          {...props}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={10}
          style={styles.eye}
          accessibilityRole="button"
          accessibilityLabel={t(visible ? "App.account.hidePassword" : "App.account.showPassword")}
        >
          {visible ? <EyeOff size={22} color={Colors.textMuted} /> : <Eye size={22} color={Colors.textMuted} />}
        </Pressable>
      </View>

      {showStrength && (
        <>
          <View style={styles.requirement}>
            <Check size={14} color={longEnough ? Colors.success : Colors.textMuted} strokeWidth={3} />
            <Text style={[styles.requirementText, longEnough && { color: Colors.success }]}>
              {t("App.account.passwordMin", { count: value.length, min: MIN_PASSWORD })}
            </Text>
          </View>
          {longEnough && (
            <>
              <View style={styles.bars}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[styles.bar, i < level.bars && { backgroundColor: level.color }]} />
                ))}
              </View>
              <Text style={[styles.strengthText, { color: level.color }]}>
                {t(`App.account.strength.${strength}`)}
              </Text>
              {strength !== "strong" && <Text style={styles.tip}>{t("App.account.strength.tip")}</Text>}
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
  },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: Colors.text },
  eye: { paddingHorizontal: 14, paddingVertical: 12 },
  requirement: { flexDirection: "row", alignItems: "center", gap: 6 },
  requirementText: { fontSize: 12, color: Colors.textMuted },
  bars: { flexDirection: "row", gap: 6 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB" },
  strengthText: { fontSize: 12, fontWeight: "700" },
  tip: { fontSize: 12, color: Colors.textMuted },
});
