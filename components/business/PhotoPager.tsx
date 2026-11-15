import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Colors from "@/constants/Colors";
import { Text } from "@/components/ui/Text";
import type { BusinessItem } from "@/lib/business";
import { mediaUrl } from "@/lib/konbits";

// Photos d'un article : on les fait défiler du doigt, avec des points ; un
// toucher appelle onOpen (page de l'article, ou plein écran sur cette page).
export default function PhotoPager({
  photos,
  width,
  height = width,
  kind,
  onOpen,
}: {
  photos: BusinessItem["photos"];
  width: number;
  height?: number;
  kind: BusinessItem["kind"];
  onOpen: (index: number) => void;
}) {
  const [index, setIndex] = useState(0);
  if (photos.length === 0) {
    return (
      <Pressable onPress={() => onOpen(0)} style={[styles.placeholder, { width, height }]}>
        <Text style={styles.placeholderText}>{kind === "service" ? "✦" : "▢"}</Text>
      </Pressable>
    );
  }
  return (
    <View style={{ width, height }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {photos.map((p, i) => (
          <Pressable key={p.path} onPress={() => onOpen(i)} accessibilityRole="imagebutton">
            <Image source={{ uri: mediaUrl(p.path) }} style={{ width, height }} contentFit="cover" />
          </Pressable>
        ))}
      </ScrollView>
      {photos.length > 1 && (
        <View style={styles.dots}>
          {photos.map((p, i) => (
            <View key={p.path} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: Colors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  placeholderText: { fontSize: 30, color: Colors.textMuted },
  dots: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    flexDirection: "row",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.6)" },
  dotActive: { width: 14, backgroundColor: "#FFFFFF" },
});
