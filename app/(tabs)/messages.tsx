import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../provider/AuthProvider";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { CircleUserRound } from "lucide-react-native";
import { Image } from "expo-image";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

const MessagesScreen = () => {
  const { session } = useAuth();
  const router = useRouter();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", session?.user?.id],
    queryFn: async () => {
      // Get conversations where user participates
      const { data: parts } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", session!.user.id);

      if (!parts?.length) return [];

      const convIds = parts.map((p: any) => p.conversation_id);

      // Get last message + other participant for each conversation
      const { data: msgs } = await supabase
        .from("messages")
        .select("*, sender:profiles!sender_id(username, avatar_url, full_name)")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false });

      // Group and deduplicate by conversation
      const grouped: Record<string, any> = {};
      msgs?.forEach((m: any) => {
        if (!grouped[m.conversation_id]) {
          grouped[m.conversation_id] = {
            id: m.conversation_id,
            lastMsg: m.content,
            time: new Date(m.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            sender: m.sender,
            unread: m.read ? 0 : 1, // simplified
          };
        }
      });

      return Object.values(grouped).slice(0, 20);
    },
    enabled: !!session?.user?.id,
  });

  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="message-outline"
            size={56}
            color="#D1D5DB"
          />
          <Text style={styles.emptyTitle}>Connectez-vous</Text>
          <Text style={styles.emptySub}>Accédez à vos messages privés</Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push("/(auth)/signIn")}
          >
            <Text style={styles.loginBtnText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      <FlatList
        data={conversations || []}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatRow}>
            {item.sender?.avatar_url ? (
              <Image
                source={{ uri: item.sender.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <CircleUserRound color="#9CA3AF" size={24} />
              </View>
            )}
            <View style={styles.chatInfo}>
              <View style={styles.chatTop}>
                <Text style={styles.chatName} numberOfLines={1}>
                  {item.sender?.full_name ||
                    item.sender?.username ||
                    "Utilisateur"}
                </Text>
                <Text style={styles.chatTime}>{item.time}</Text>
              </View>
              <View style={styles.chatBottom}>
                <Text style={styles.chatLastMsg} numberOfLines={1}>
                  {item.lastMsg}
                </Text>
                {item.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="inbox" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Aucun message</Text>
            <Text style={styles.emptySub}>
              Vos conversations apparaîtront ici
            </Text>
          </View>
        }
        refreshing={isLoading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF5" },
  header: { paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#1A1A2E" },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    gap: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0F0EB",
    justifyContent: "center",
    alignItems: "center",
  },
  chatInfo: { flex: 1 },
  chatTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  chatName: { fontSize: 15, fontWeight: "700", color: "#1A1A2E", flex: 1 },
  chatTime: { fontSize: 12, color: "#9CA3AF" },
  chatBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatLastMsg: { fontSize: 13, color: "#6B7280", flex: 1 },
  unreadBadge: {
    backgroundColor: "#0D9488",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A2E",
    marginTop: 8,
  },
  emptySub: { fontSize: 14, color: "#9CA3AF", textAlign: "center" },
  loginBtn: {
    marginTop: 16,
    backgroundColor: "#0D9488",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  loginBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});

export default MessagesScreen;
