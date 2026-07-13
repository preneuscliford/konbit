import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../provider/AuthProvider";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { CircleUserRound } from "lucide-react-native";
import { Image } from "expo-image";
import RemoteImage from "@/components/RemoteImage";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { getFollowingList } from "@/lib/socialService";

const MessagesScreen = () => {
  const { session, user } = useAuth();
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);

  const { data: conversations } = useQuery({
    queryKey: ["conversations", session?.user?.id],
    queryFn: async () => {
      // Get my conversations
      const { data: myParts } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", session!.user.id);

      if (!myParts?.length) return [];

      const convIds = myParts.map((p: any) => p.conversation_id);

      // Get last message + other participant for each conversation
      const { data: msgs } = await supabase
        .from("messages")
        .select("content, read, created_at, conversation_id, sender_id")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false });

      // Get other participants
      const { data: allParts } = await supabase
        .from("conversation_participants")
        .select(
          "conversation_id, user:profiles!user_id(id, username, full_name, avatar_url)",
        )
        .in("conversation_id", convIds)
        .neq("user_id", session!.user.id);

      // Build conversation list
      const grouped: Record<string, any> = {};
      convIds.forEach((cid: number) => {
        const other = allParts?.find((p: any) => p.conversation_id === cid);
        const lastMsg = msgs?.find((m: any) => m.conversation_id === cid);
        const unreadCount =
          msgs?.filter(
            (m: any) =>
              m.conversation_id === cid &&
              m.sender_id !== session!.user.id &&
              !m.read,
          ).length || 0;

        grouped[cid] = {
          id: cid,
          otherUser: other?.user || null,
          lastMsg: lastMsg?.content || "",
          time: lastMsg
            ? new Date(lastMsg.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          unread: unreadCount,
        };
      });

      return Object.values(grouped).sort(
        (a, b) =>
          new Date(b.lastMsg?.created_at || 0).getTime() -
          new Date(a.lastMsg?.created_at || 0).getTime(),
      );
    },
    enabled: !!session?.user?.id,
  });

  const { data: following } = useQuery({
    queryKey: ["following-list", user?.id],
    queryFn: () => getFollowingList(user!.id),
    enabled: !!user?.id,
  });

  const startConversation = async (targetId: string) => {
    // Check existing
    const { data: myConvs } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user!.id);

    const myIds = (myConvs || []).map((c: any) => c.conversation_id);
    if (myIds.length > 0) {
      const { data: shared } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", targetId)
        .in("conversation_id", myIds);
      if (shared?.length) {
        setShowNew(false);
        router.push("/(tabs)/messages");
        return;
      }
    }

    // Create new
    const { data: conv } = await supabase
      .from("conversations")
      .insert({})
      .select()
      .single();
    if (conv) {
      await supabase.from("conversation_participants").insert([
        { conversation_id: conv.id, user_id: user!.id },
        { conversation_id: conv.id, user_id: targetId },
      ]);
    }
    setShowNew(false);
    router.push("/(tabs)/messages");
  };

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
            {item.otherUser?.avatar_url ? (
              item.otherUser.avatar_url.startsWith("https://") ? (
                <Image
                  source={{ uri: item.otherUser.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <RemoteImage
                  path={item.otherUser.avatar_url}
                  fallback="profile-placeholder"
                  style={styles.avatar}
                />
              )
            ) : (
              <View style={styles.avatarPlaceholder}>
                <CircleUserRound color="#9CA3AF" size={24} />
              </View>
            )}
            <View style={styles.chatInfo}>
              <View style={styles.chatTop}>
                <Text style={styles.chatName} numberOfLines={1}>
                  {item.otherUser?.full_name ||
                    item.otherUser?.username ||
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
              Appuyez sur + pour démarrer une conversation
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowNew(true)}>
        <MaterialCommunityIcons name="pencil-plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* New Message Modal */}
      <Modal
        visible={showNew}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNew(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={["top"]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNew(false)}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nouveau message</Text>
            <View style={{ width: 60 }} />
          </View>
          <FlatList
            data={following || []}
            keyExtractor={(item: any) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.userRow}
                onPress={() => startConversation(item.id)}
              >
                {item.avatar_url ? (
                  item.avatar_url.startsWith("https://") ? (
                    <Image
                      source={{ uri: item.avatar_url }}
                      style={styles.avatar}
                    />
                  ) : (
                    <RemoteImage
                      path={item.avatar_url}
                      fallback="profile-placeholder"
                      style={styles.avatar}
                    />
                  )
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <CircleUserRound color="#9CA3AF" size={22} />
                  </View>
                )}
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {item.full_name || item.username}
                  </Text>
                  <Text style={styles.userHandle}>@{item.username}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptySub}>Vous ne suivez personne</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
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

  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#0D9488",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  modalContainer: { flex: 1, backgroundColor: "#FAFAF5" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0EB",
  },
  cancelText: { fontSize: 15, color: "#6B7280" },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A2E" },

  userRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    gap: 12,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: "700", color: "#1A1A2E" },
  userHandle: { fontSize: 13, color: "#9CA3AF" },
});

export default MessagesScreen;
