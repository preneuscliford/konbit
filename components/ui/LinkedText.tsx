import React from "react";
import { Linking, StyleSheet, type StyleProp, type TextStyle } from "react-native";
import Colors from "@/constants/Colors";
import { Text } from "@/components/ui/Text";

interface Props {
  // Texte traduit contenant des marqueurs, par ex. "Tu acceptes les {terms} et la {privacy}."
  text: string;
  links: Record<string, { label: string; url: string }>;
  style?: StyleProp<TextStyle>;
}

// Phrase dont certains mots ouvrent une page web (conditions, confidentialité…).
export default function LinkedText({ text, links, style }: Props) {
  const parts = text.split(/(\{\w+\})/);
  return (
    <Text style={style}>
      {parts.map((part, i) => {
        const link = links[part.slice(1, -1)];
        if (!part.startsWith("{") || !link) return part;
        return (
          <Text key={i} style={styles.link} onPress={() => Linking.openURL(link.url)} accessibilityRole="link">
            {link.label}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  link: { color: Colors.primary, fontWeight: "600", textDecorationLine: "underline" },
});
