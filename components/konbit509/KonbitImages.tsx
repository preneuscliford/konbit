import React from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { mediaUrl, type KonbitImage } from "@/lib/konbits";

// 1 image : pleine largeur, à son format (bornée). 2 images : côte à côte.
// Cache disque d'expo-image : une image vue n'est téléchargée qu'une fois.
export default function KonbitImages({ media }: { media: KonbitImage[] }) {
  const images = media.filter((m) => m.type === "image").slice(0, 2);
  if (images.length === 0) return null;

  if (images.length === 1) {
    const { path, width, height } = images[0];
    const ratio = width && height ? Math.min(Math.max(width / height, 0.75), 1.9) : 4 / 3;
    return (
      <Image
        source={{ uri: mediaUrl(path) }}
        style={[styles.single, { aspectRatio: ratio }]}
        contentFit="cover"
        cachePolicy="disk"
        transition={150}
      />
    );
  }

  return (
    <View style={styles.row}>
      {images.map((image) => (
        <Image
          key={image.path}
          source={{ uri: mediaUrl(image.path) }}
          style={styles.half}
          contentFit="cover"
          cachePolicy="disk"
          transition={150}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  single: { width: "100%", borderRadius: 14, backgroundColor: "#F0F0EB" },
  row: { flexDirection: "row", gap: 4, borderRadius: 14, overflow: "hidden" },
  half: { flex: 1, aspectRatio: 0.8, backgroundColor: "#F0F0EB" },
});
