import React, { useState } from "react";
import { FlatList, Modal, Pressable, StatusBar, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { X } from "lucide-react-native";
import { Text } from "@/components/ui/Text";

// Photos en plein écran (pòs, konbit, fiche, katalòg) : balayage d'une photo
// à l'autre, compteur, × ou bouton retour d'Android pour fermer.
export default function ImageViewer({
  uris,
  start,
  onClose,
}: {
  uris: string[];
  // Index de la photo touchée ; null = visionneuse fermée.
  start: number | null;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(start ?? 0);
  const [shownFor, setShownFor] = useState<number | null>(null);
  // Nouvelle ouverture : on repart de la photo touchée.
  if (start !== shownFor) {
    setShownFor(start);
    if (start !== null) setIndex(start);
  }

  return (
    <Modal visible={start !== null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar barStyle="light-content" />
      <View style={styles.backdrop}>
        {start !== null && (
          <FlatList
            data={uris}
            keyExtractor={(uri) => uri}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={start}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <Pressable onPress={onClose} style={{ width, height }}>
                <Image source={{ uri: item }} style={{ width, height }} contentFit="contain" cachePolicy="disk" />
              </Pressable>
            )}
          />
        )}
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={[styles.close, { top: insets.top + 10 }]}
          accessibilityRole="button"
          accessibilityLabel="Fèmen"
        >
          <X size={26} color="#FFFFFF" />
        </Pressable>
        {uris.length > 1 && (
          <View style={[styles.counter, { bottom: insets.bottom + 20 }]}>
            <Text style={styles.counterText}>
              {index + 1} / {uris.length}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#000000" },
  close: {
    position: "absolute",
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  counterText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});
