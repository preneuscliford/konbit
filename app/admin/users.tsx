import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, Search } from "lucide-react-native";
import Colors from "@/constants/Colors";
import AdminScreen from "@/components/admin/AdminScreen";
import Avatar from "@/components/konbit509/Avatar";
import { Text, TextInput } from "@/components/ui/Text";
import { useUserSearch } from "@/hooks/useAdmin";
import type { AdminUserRow } from "@/lib/admin";
import { useI18n } from "@/lib/i18n";

// Chercher un compte par pseudo ou nom. Sans recherche : comptes sanctionnés
// d'abord, puis les plus récents.
export default function AdminUsers() {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const users = useUserSearch(search);

  // Recherche lancée après une courte pause dans la frappe.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), 350);
    return () => clearTimeout(timer);
  }, [input]);

  return (
    <AdminScreen title={t("App.admin.users.title")}>
      <View style={styles.searchBox}>
        <Search size={18} color={Colors.textMuted} />
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t("App.admin.users.search")}
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.searchInput}
        />
      </View>
      <FlatList
        data={users.data ?? []}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => <UserRow user={item} />}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          users.isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
          ) : (
            <Text style={styles.empty}>{t(users.isError ? "App.loadError" : "App.admin.users.none")}</Text>
          )
        }
      />
    </AdminScreen>
  );
}

function UserRow({ user }: { user: AdminUserRow }) {
  const { t } = useI18n();
  const router = useRouter();
  const restricted = user.restricted_until && new Date(user.restricted_until) > new Date();

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/admin/user/[id]", params: { id: user.id } })}
      style={styles.row}
      android_ripple={{ color: "rgba(0,0,0,0.04)" }}
    >
      <Avatar pseudo={user.pseudo} name={user.display_name} avatarPath={user.avatar_path} seed={user.id} size={38} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.name} numberOfLines={1}>
          {user.display_name || user.pseudo}
        </Text>
        <Text style={styles.small}>@{user.pseudo}</Text>
      </View>
      {user.role !== "user" && <Text style={styles.role}>{t(`App.admin.roles.${user.role}`)}</Text>}
      {user.suspended_at ? (
        <Text style={[styles.flag, styles.flagRed]}>{t("App.admin.user.suspended")}</Text>
      ) : restricted ? (
        <Text style={styles.flag}>{t("App.admin.user.restricted")}</Text>
      ) : null}
      <ChevronRight size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 22,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: Colors.text },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0F0EB",
  },
  name: { fontSize: 15, fontWeight: "700", color: Colors.text },
  small: { fontSize: 12, color: Colors.textMuted },
  role: { fontSize: 11, fontWeight: "700", color: Colors.primary },
  flag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
  },
  flagRed: { color: "#991B1B", backgroundColor: "#FEE2E2" },
  empty: { textAlign: "center", color: Colors.textMuted, padding: 32 },
});
