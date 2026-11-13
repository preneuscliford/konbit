import React, { useCallback, useRef, useState } from "react";
import { Pressable, type NativeSyntheticEvent, type TextInputSelectionChangeEventData } from "react-native";
import EmojiPicker, { fr } from "rn-emoji-keyboard";
import { Smile } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { useI18n } from "@/lib/i18n";

// Bibliothèque d'emoji pour les champs libres seulement (pòs, konbit,
// messages et réponses) : jamais pour les données de compte (pseudo, e-mail…).

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
      <EmojiPicker
        open={open}
        onClose={() => setOpen(false)}
        onEmojiSelected={(e) => onPick(e.emoji)}
        enableSearchBar
        enableRecentlyUsed
        categoryPosition="top"
        translation={language === "fr" ? fr : HT}
        theme={{
          backdrop: "rgba(0,0,0,0.45)",
          knob: Colors.borderStrong,
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
    </>
  );
}
