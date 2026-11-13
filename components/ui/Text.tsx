import React from "react";
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from "react-native";
import Colors from "@/constants/Colors";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from "@expo-google-fonts/poppins";

// Polices chargées au démarrage (app/_layout.tsx).
export const FONT_ASSETS = {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
};

// Sur Android, fontWeight ne choisit pas la graisse d'une police
// personnalisée : il faut un fichier par graisse. On garde fontWeight dans
// les styles (plus lisible) et on le traduit ici en fontFamily Poppins.
const FAMILY_BY_WEIGHT: Record<string, string> = {
  "100": "Poppins_400Regular",
  "200": "Poppins_400Regular",
  "300": "Poppins_400Regular",
  "400": "Poppins_400Regular",
  normal: "Poppins_400Regular",
  "500": "Poppins_500Medium",
  "600": "Poppins_600SemiBold",
  "700": "Poppins_700Bold",
  bold: "Poppins_700Bold",
  "800": "Poppins_800ExtraBold",
  "900": "Poppins_800ExtraBold",
};

function withPoppins<T extends { style?: unknown }>(props: T): T {
  const flat = (StyleSheet.flatten(props.style as never) ?? {}) as {
    fontWeight?: string;
    fontFamily?: string;
    color?: string;
  };
  // Couleur du thème par défaut (lisible en clair comme en sombre) ; un style
  // avec sa propre couleur la remplace.
  const color = flat.color ?? Colors.text;
  if (flat.fontFamily) return { ...props, style: [flat, { color }] };
  const fontFamily = FAMILY_BY_WEIGHT[String(flat.fontWeight ?? "400")] ?? "Poppins_400Regular";
  return { ...props, style: [flat, { fontFamily, fontWeight: undefined, color }] };
}

export function Text(props: TextProps) {
  return <RNText {...withPoppins(props)} />;
}

// Champs : texte, indication et curseur aux couleurs du thème par défaut.
export const TextInput = React.forwardRef<RNTextInput, TextInputProps>((props, ref) => (
  <RNTextInput
    ref={ref}
    placeholderTextColor={Colors.textMuted}
    selectionColor={Colors.primary}
    keyboardAppearance={Colors.isDark ? "dark" : "light"}
    {...withPoppins(props)}
  />
));
TextInput.displayName = "TextInput";
