import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import ImageViewer from "@/components/ui/ImageViewer";
import { mediaUrl, type KonbitImage } from "@/lib/konbits";
import Colors from "@/constants/Colors";

// 1 image : pleine largeur, à son format (bornée). 2 images : côte à côte.
// Un toucher ouvre les photos en plein écran (balayage entre elles).
// Cache disque d'expo-image : une image vue n'est téléchargée qu'une fois.
export default function KonbitImages({ media }: { media: KonbitImage[] }) {
  const images = media.filter((m) => m.type === "image").slice(0, 2);
  const [viewer, setViewer] = useState<number | null>(null);
  if (images.length === 0) return null;
  const uris = images.map((i) => mediaUrl(i.path));

  const viewerNode = <ImageViewer uris={uris} start={viewer} onClose={() => setViewer(null)} />;

  if (images.length === 1) {
    const { width, height } = images[0];
    const ratio = width && height ? Math.min(Math.max(width / height, 0.75), 1.9) : 4 / 3;
    return (
      <>
        <Pressable onPress={() => setViewer(0)} accessibilityRole="imagebutton">
          <Image
            source={{ uri: uris[0] }}
            style={[styles.single, { aspectRatio: ratio }]}
            contentFit="cover"
            cachePolicy="disk"
            transition={150}
          />
        </Pressable>
        {viewerNode}
      </>
    );
  }

  return (
    <>
      <View style={styles.row}>
        {uris.map((uri, i) => (
          <Pressable key={uri} onPress={() => setViewer(i)} style={styles.half} accessibilityRole="imagebutton">
            <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" transition={150} />
          </Pressable>
        ))}
      </View>
      {viewerNode}
    </>
  );
}

const styles = StyleSheet.create({
  single: { width: "100%", borderRadius: 14, backgroundColor: Colors.borderSoft },
  row: { flexDirection: "row", gap: 4, borderRadius: 14, overflow: "hidden" },
  half: { flex: 1, aspectRatio: 0.8, backgroundColor: Colors.borderSoft },
});
