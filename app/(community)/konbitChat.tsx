import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image as RNImage,
  ScrollView,
  Keyboard,
} from "react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/app/provider/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { CircleUserRound } from "lucide-react-native";
import { ActivityIndicator } from "react-native-paper";
import BackAppbar from "@/components/AppBar";
import RemoteImage from "@/components/RemoteImage";
import Colors from "@/constants/Colors";
import { timeAgo } from "@/utils/date";
import {
  fetchKonbitDetails,
  fetchKonbitMessages,
  fetchKonbitParticipants,
  getKonbitMediaUrl,
  sendKonbitMessage,
  uploadKonbitChatImage,
} from "@/lib/konbitServices";

const EMOJIS = [
  "😀", "😂", "😍", "😊", "😉", "😅", "😎", "🤔", "😢", "😮",
  "😴", "🙏", "👍", "👎", "👏", "🙌", "🤝", "💪", "✌️", "🤞",
  "❤️", "🔥", "🎉", "✨", "💡", "👀", "😌", "😇", "🥳", "😭",
  "💯", "✅", "❌", "⏰", "📍", "📅", "🙋", "🤗", "😁", "🚀",
];

const KonbitChat = () => {
  const { konbitId } = useLocalSearchParams();
  const { user, userData } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList>(null);
  const [text, setText] = useState("");
  const [pickedImage, setPickedImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const instanceId = useMemo(() => Math.random().toString(36).slice(2, 8), []);

  const { data: konbit } = useQuery({
    queryKey: ["konbit-chat-konbit", konbitId],
    queryFn: () => fetchKonbitDetails(konbitId as string),
    enabled: !!konbitId,
  });

  const { data: participants } = useQuery({
    queryKey: ["konbit-participants", konbitId],
    queryFn: () => fetchKonbitParticipants(konbitId as string),
    enabled: !!konbitId,
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ["konbit-messages", konbitId],
    queryFn: () => fetchKonbitMessages(konbitId as string),
    enabled: !!konbitId,
  });

  const isMember =
    !!konbit &&
    (konbit.user_id === user?.id ||
      !!participants?.some((p: any) => p.user_id === user?.id));

  useEffect(() => {
    if (!konbitId) return;
    const channel = supabase
      .channel(`konbit-messages-${konbitId}-${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "konbit_messages",
          filter: `konbit_id=eq.${konbitId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["konbit-messages", konbitId],
          });
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [konbitId]);

  const toggleEmojiPicker = () => {
    if (!showEmojiPicker) Keyboard.dismiss();
    setShowEmojiPicker((prev) => !prev);
  };

  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!result.canceled) setPickedImage(result.assets[0]);
  };

  const handleSend = async () => {
    if (isSending || !user?.id) return;
    if (!text.trim() && !pickedImage) return;
    setIsSending(true);
    try {
      let imagePath: string | null = null;
      if (pickedImage) {
        imagePath = await uploadKonbitChatImage(pickedImage);
      }
      await sendKonbitMessage(
        Number(konbitId),
        user.id,
        text.trim() || null,
        imagePath,
      );
      setText("");
      setPickedImage(null);
      queryClient.invalidateQueries({ queryKey: ["konbit-messages", konbitId] });
    } finally {
      setIsSending(false);
    }
  };

  if (!isLoading && konbit && !isMember) {
    return (
      <View style={styles.safeArea}>
        <BackAppbar title="Discussion" />
        <View style={styles.blockedState}>
          <Feather name="lock" size={40} color="#D1D5DB" />
          <Text style={styles.blockedTitle}>Discussion réservée</Text>
          <Text style={styles.blockedSub}>
            Rejoignez cette Konbit pour accéder à sa discussion.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.safeArea}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <BackAppbar title={konbit?.title || "Discussion"} />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages || []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const mine = item.user_id === user?.id;
            return (
              <View
                style={[
                  styles.messageRow,
                  mine && styles.messageRowMine,
                ]}
              >
                {!mine &&
                  (item.profiles?.avatar_url ? (
                    item.profiles.avatar_url.startsWith("https://") ? (
                      <RNImage
                        source={{ uri: item.profiles.avatar_url }}
                        style={styles.avatar}
                      />
                    ) : (
                      <RemoteImage
                        path={item.profiles.avatar_url}
                        fallback="profile-placeholder"
                        style={styles.avatar}
                      />
                    )
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <CircleUserRound color="#9CA3AF" size={16} />
                    </View>
                  ))}
                <View
                  style={[styles.bubble, mine && styles.bubbleMine]}
                >
                  {!mine && (
                    <Text style={styles.bubbleAuthor}>
                      {item.profiles?.full_name || item.profiles?.username}
                    </Text>
                  )}
                  {item.image_path ? (
                    <Image
                      source={{ uri: getKonbitMediaUrl(item.image_path) }}
                      style={styles.bubbleImage}
                    />
                  ) : null}
                  {item.content ? (
                    <Text
                      style={[
                        styles.bubbleText,
                        mine && styles.bubbleTextMine,
                      ]}
                    >
                      {item.content}
                    </Text>
                  ) : null}
                  <Text
                    style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}
                  >
                    {timeAgo(item.created_at)}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="message-square" size={40} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Aucun message</Text>
              <Text style={styles.emptySub}>
                Démarrez la discussion avec les autres membres
              </Text>
            </View>
          }
        />
      )}

      {pickedImage && (
        <View style={styles.previewRow}>
          <RNImage source={{ uri: pickedImage.uri }} style={styles.previewImage} />
          <TouchableOpacity
            onPress={() => setPickedImage(null)}
            style={styles.previewRemove}
          >
            <Feather name="x" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {showEmojiPicker && (
        <View style={styles.emojiPanel}>
          <ScrollView contentContainerStyle={styles.emojiGrid}>
            {EMOJIS.map((emoji, index) => (
              <TouchableOpacity
                key={`${emoji}-${index}`}
                style={styles.emojiKey}
                onPress={() => insertEmoji(emoji)}
              >
                <Text style={styles.emojiKeyText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.inputBar}>
        <TouchableOpacity onPress={toggleEmojiPicker} style={styles.iconBtn}>
          <Feather
            name="smile"
            size={22}
            color={showEmojiPicker ? Colors.primary : Colors.textMuted}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={pickImage} style={styles.iconBtn}>
          <Feather name="image" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          disabled
          accessibilityLabel="Partage de fichiers bientôt disponible"
        >
          <Feather name="paperclip" size={22} color={Colors.textMuted} style={{ opacity: 0.4 }} />
        </TouchableOpacity>
        <TextInput
          value={text}
          onChangeText={setText}
          onFocus={() => setShowEmojiPicker(false)}
          placeholder="Écrire un message..."
          placeholderTextColor={Colors.textMuted}
          style={styles.textInput}
          multiline
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={isSending || (!text.trim() && !pickedImage)}
          style={[
            styles.sendBtn,
            isSending || (!text.trim() && !pickedImage)
              ? { opacity: 0.5 }
              : null,
          ]}
        >
          <Feather name="send" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FAFAF5" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 14, gap: 10, flexGrow: 1 },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 4,
  },
  messageRowMine: { flexDirection: "row-reverse" },
  avatar: { width: 26, height: 26, borderRadius: 13 },
  avatarPlaceholder: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F0F0EB",
    justifyContent: "center",
    alignItems: "center",
  },
  bubble: {
    maxWidth: "75%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleMine: { backgroundColor: Colors.primary },
  bubbleAuthor: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 2,
  },
  bubbleImage: {
    width: 180,
    height: 180,
    borderRadius: 10,
    marginBottom: 6,
  },
  bubbleText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  bubbleTextMine: { color: "#FFFFFF" },
  bubbleTime: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  bubbleTimeMine: { color: "rgba(255,255,255,0.75)" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingTop: 80,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: "center" },
  blockedState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 40,
  },
  blockedTitle: { fontSize: 17, fontWeight: "700", color: Colors.text },
  blockedSub: { fontSize: 13, color: Colors.textMuted, textAlign: "center" },
  previewRow: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  previewImage: { width: 64, height: 64, borderRadius: 10 },
  previewRemove: {
    position: "absolute",
    top: 4,
    left: 60,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    padding: 3,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0EB",
    backgroundColor: "#FFFFFF",
  },
  iconBtn: { paddingBottom: 8 },
  emojiPanel: {
    maxHeight: 180,
    borderTopWidth: 1,
    borderTopColor: "#F0F0EB",
    backgroundColor: "#FFFFFF",
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
  },
  emojiKey: {
    width: "10%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emojiKeyText: { fontSize: 24 },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: "#F7F7F2",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default KonbitChat;
