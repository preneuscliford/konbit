import React, { useRef, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import * as Burnt from "burnt";
import { Heart } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { Text } from "@/components/ui/Text";
import { useAccountGate } from "@/hooks/useAccountGate";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { setItemLike } from "@/lib/itemSocial";

// Cœur d'un article du katalòg : le nombre de J'aime est public.
export default function ItemLike({
  itemId,
  count,
  liked,
  size = 18,
}: {
  itemId: number;
  count: number;
  liked: boolean;
  size?: number;
}) {
  const { t } = useI18n();
  const { userId } = useAuth();
  const requireAccount = useAccountGate();
  const [state, setState] = useState({ liked, count });
  const busy = useRef(false);

  // Nouvel état du parent (J'aime chargés après coup).
  const [source, setSource] = useState({ liked, count });
  if (source.liked !== liked || source.count !== count) {
    setSource({ liked, count });
    setState({ liked, count });
  }

  function toggle() {
    requireAccount(async () => {
      if (busy.current || !userId) return;
      busy.current = true;
      const on = !state.liked;
      setState((s) => ({ liked: on, count: Math.max(0, s.count + (on ? 1 : -1)) }));
      try {
        await setItemLike(itemId, userId, on);
      } catch {
        setState((s) => ({ liked: !on, count: Math.max(0, s.count + (on ? -1 : 1)) }));
        Burnt.toast({ title: t("App.konbitErrors.failed"), preset: "error" });
      } finally {
        busy.current = false;
      }
    });
  }

  return (
    <Pressable
      onPress={toggle}
      hitSlop={8}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={t("App.item.like")}
      accessibilityState={{ selected: state.liked }}
    >
      <Heart
        size={size}
        color={state.liked ? Colors.secondary : Colors.textMuted}
        fill={state.liked ? Colors.secondary : "transparent"}
      />
      {state.count > 0 && (
        <Text style={[styles.count, { fontSize: size * 0.75 }, state.liked && { color: Colors.secondary }]}>
          {state.count}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 5 },
  count: { color: Colors.textMuted, fontWeight: "600" },
});
