import React, { useCallback, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmojiKeyboard, fr } from "rn-emoji-keyboard";
import { Smile } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { useI18n } from "@/lib/i18n";

// Bibliothèque d'emoji pour les champs libres seulement (pòs, konbit,
// messages et réponses) : jamais pour les données de compte (pseudo, e-mail…).
//
// La liste d'emoji (EmojiKeyboard de rn-emoji-keyboard) est affichée dans
// notre propre panneau (Modal Android avec glissement natif). Le sélecteur
// tout fait de la bibliothèque (EmojiPicker) lance son animation d'entrée
// avant que le panneau existe côté natif : en version de production, sur la
// nouvelle architecture de React Native, il restait hors de l'écran et seul
// le fond sombre apparaissait.

const HT = {
  recently_used: "Sa w itilize dènyèman",
  smileys_emotion: "Figi & santiman",
  people_body: "Moun & kò",
  animals_nature: "Bèt & lanati",
  food_drink: "Manje & bwason",
  travel_places: "Vwayaj & kote",
  activities: "Aktivite",
  objects: "Objè",
  symbols: "Senbòl",
  flags: "Drapo",
  search: "Chèche",
};

// Insère l'emoji à la position du curseur (et pas seulement à la fin).
export function useEmojiInput(value: string, setValue: (next: string) => void, max?: number) {
  const selection = useRef({ start: value.length, end: value.length });

  const onSelectionChange = useCallback((e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    selection.current = e.nativeEvent.selection;
  }, []);

  const insert = useCallback(
    (emoji: string) => {
      const { start, end } = selection.current;
      const from = Math.min(start, value.length);
      const to = Math.min(end, value.length);
      const next = value.slice(0, from) + emoji + value.slice(to);
      if (max && next.length > max) return;
      setValue(next);
      selection.current = { start: from + emoji.length, end: from + emoji.length };
    },
    [value, setValue, max],
  );

  return { onSelectionChange, insert };
}

export default function EmojiButton({ onPick, size = 22 }: { onPick: (emoji: string) => void; size?: number }) {
  const { language } = useI18n();
  const [open, setOpen] = useState(false);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const close = () => setOpen(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}
        accessibilityRole="button"
        accessibilityLabel="Emoji"
      >
        <Smile size={size} color={Colors.primary} />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={close}
      >
        <View style={styles.root}>
          {/* Toucher en dehors du panneau le ferme. */}
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Fèmen" />
          <View
            style={[
              styles.panel,
              { height: Math.round(height * 0.5) + insets.bottom, paddingBottom: insets.bottom },
            ]}
          >
            <View style={styles.knob} />
            <EmojiKeyboard
              onEmojiSelected={(e) => {
                onPick(e.emoji);
                close();
              }}
              enableSearchBar
              enableRecentlyUsed
              categoryPosition="top"
              // Saut direct à la catégorie touchée (l'animation échouait sur
              // Android) ; les marges du bas sont gérées par notre panneau.
              enableCategoryChangeAnimation={false}
              disableSafeArea
              translation={language === "fr" ? fr : HT}
              styles={{ container: styles.keyboard }}
              theme={{
                container: Colors.surface,
                header: Colors.text,
                skinTonesContainer: Colors.surfaceMuted,
                category: {
                  icon: Colors.textMuted,
                  iconActive: Colors.textInverse,
                  container: Colors.surfaceMuted,
                  containerActive: Colors.primary,
                },
                search: {
                  background: Colors.surfaceMuted,
                  text: Colors.text,
                  placeholder: Colors.textMuted,
                  icon: Colors.textMuted,
                },
                emoji: { selected: Colors.primary50 },
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  panel: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  knob: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.borderStrong,
    marginTop: 8,
    marginBottom: 4,
  },
  keyboard: { flex: 1, borderRadius: 0, shadowOpacity: 0, elevation: 0 },
});
