import React from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/ui/Text";
import { profileImageUrl } from "@/lib/konbits";

// Photo de profil si la personne en a mis une (petite, mise en cache disque),
// sinon des initiales sur une couleur stable par personne.
const PALETTE = ["#00209F", "#D21034", "#0F766E", "#7C3AED", "#B45309", "#0369A1", "#BE185D"];

function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export default function Avatar({
  pseudo,
  name,
  avatarPath,
  seed,
  size = 40,
  ring = false,
}: {
  pseudo: string | null;
  name?: string | null;
  avatarPath?: string | null;
  seed: string;
  size?: number;
  // Bord blanc, pour l'avatar qui chevauche la couverture du profil.
  ring?: boolean;
}) {
  const box = [
    styles.circle,
    { width: size, height: size, borderRadius: size / 2 },
    ring && { borderWidth: 4, borderColor: "#FFFFFF" },
  ];

  if (avatarPath) {
    return (
      <Image
        source={{ uri: profileImageUrl(avatarPath) }}
        style={[box, { backgroundColor: "#E5E7EB" }]}
        contentFit="cover"
        cachePolicy="disk"
        transition={120}
      />
    );
  }

  const initials = (name || pseudo || "?").replace(/_/g, " ").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <View style={[box, { backgroundColor: colorFor(seed) }]}>
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  text: { color: "#FFFFFF", fontWeight: "700" },
});
