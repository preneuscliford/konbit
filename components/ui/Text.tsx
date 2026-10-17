import React from "react";
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from "react-native";
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
  const flat = (StyleSheet.flatten(props.style as never) ?? {}) as { fontWeight?: string; fontFamily?: string };
  if (flat.fontFamily) return props;
  const fontFamily = FAMILY_BY_WEIGHT[String(flat.fontWeight ?? "400")] ?? "Poppins_400Regular";
  return { ...props, style: [flat, { fontFamily, fontWeight: undefined }] };
}

export function Text(props: TextProps) {
  return <RNText {...withPoppins(props)} />;
}

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>((props, ref) => (
  <RNTextInput ref={ref} {...withPoppins(props)} />
));
TextInput.displayName = "TextInput";
