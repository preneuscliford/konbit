import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import * as Burnt from "burnt";
import { Bell, BellRing } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { Text } from "@/components/ui/Text";
import { useAccountGate } from "@/hooks/useAccountGate";
import { useFollowActions, useFollowState } from "@/hooks/useSocial";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

// "Swiv" / "Ap swiv", et une fois abonné, la cloche pour être notifié des
// publications de cette personne (désactivée par défaut, comme sur X).
export default function FollowButton({
  userId: otherId,
  showBell = false,
  compact = false,
}: {
  userId: string;
  showBell?: boolean;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const { userId } = useAuth();
  const requireAccount = useAccountGate();
  const state = useFollowState(otherId);
  const { toggleFollow, toggleNotify } = useFollowActions(otherId);

  if (userId === otherId) return null;

  const following = !!state.data?.following;
  const notify = !!state.data?.notify;
  const onError = () => Burnt.toast({ title: t("App.konbitErrors.failed"), preset: "error" });

  return (
    <View style={[styles.row, !compact && styles.rowFull]}>
      <Pressable
        onPress={() => requireAccount(() => toggleFollow.mutate(!following, { onError }))}
        disabled={toggleFollow.isPending}
        style={[styles.button, compact && styles.compact, !compact && styles.flex, following ? styles.outline : styles.solid]}
        android_ripple={{ color: following ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.25)" }}
        accessibilityRole="button"
        accessibilityState={{ selected: following }}
      >
        <Text style={[styles.text, following ? styles.textOutline : styles.textSolid]}>
          {following ? t("App.follow.following") : t("App.follow.follow")}
        </Text>
      </Pressable>

      {showBell && following && (
        <Pressable
          onPress={() => {
            const next = !notify;
            toggleNotify.mutate(next, { onError });
            Burnt.toast({ title: next ? t("App.follow.bellOn") : t("App.follow.bellOff"), preset: "done" });
          }}
          style={[styles.bell, notify && styles.bellOn]}
          accessibilityRole="switch"
          accessibilityState={{ checked: notify }}
          accessibilityLabel={t("App.follow.bellLabel")}
        >
          {notify ? <BellRing size={17} color="#FFFFFF" /> : <Bell size={17} color={Colors.text} />}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  rowFull: { flex: 1 },
  flex: { flex: 1 },
  button: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  compact: { height: 32, paddingHorizontal: 14, borderRadius: 16 },
  solid: { backgroundColor: Colors.primary },
  outline: { borderWidth: 1, borderColor: "#D1D5DB" },
  text: { fontSize: 14, fontWeight: "700" },
  textSolid: { color: "#FFFFFF" },
  textOutline: { color: Colors.text },
  bell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  bellOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
});
