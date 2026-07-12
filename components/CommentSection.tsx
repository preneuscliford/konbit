import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { supabase } from "@/lib/supabase";
import moment from "moment";
import RemoteImage from "./RemoteImage";
import Feather from "@expo/vector-icons/Feather";
import { TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";

interface Comment {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
  post_id: number;
  profiles: {
    username: string;
    avatar_url: string;
    full_name: string;
  };
}

interface CommentSectionProps {
  postId: string;
  currentUser: any;
  comments: Comment[];
  onCommentAdded: (success: boolean) => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  currentUser,
  comments,
  onCommentAdded,
}) => {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputScale = new Animated.Value(1);

  const animateInput = () => {
    Animated.sequence([
      Animated.timing(inputScale, {
        toValue: 0.97,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(inputScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser?.id || isSubmitting) return;

    setIsSubmitting(true);
    animateInput();

    try {
      const { error } = await supabase.from("comments").insert({
        content: newComment.trim(),
        post_id: parseInt(postId, 10),
        user_id: currentUser.id,
      });

      if (error) {
        console.error("[Comment] Insert error:", error.code, error.message);
        onCommentAdded(false);
        throw error;
      }

      setNewComment("");
      onCommentAdded(true);
    } catch (error) {
      console.error("[Comment] Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.commentsWrap}>
          <Text style={styles.title}>Commentaires</Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentCard}>
                {comment.profiles?.avatar_url?.startsWith("https://") ? (
                  <Image
                    source={{ uri: comment.profiles.avatar_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <RemoteImage
                    path={comment.profiles?.avatar_url}
                    fallback="profile image"
                    style={styles.avatar}
                  />
                )}
                <View style={styles.commentBody}>
                  <View style={styles.commentHead}>
                    <Text style={styles.username}>
                      {comment.profiles?.username ||
                        comment.profiles?.full_name}
                    </Text>
                    <Text style={styles.timestamp}>
                      {moment(comment.created_at).fromNow()}
                    </Text>
                  </View>
                  <Text style={styles.commentText}>{comment.content}</Text>
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionBtn}>
                      <Feather name="heart" size={14} color="#9CA3AF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                      <Feather
                        name="message-circle"
                        size={14}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <Animated.View
          style={[styles.inputBar, { transform: [{ scale: inputScale }] }]}
        >
          <TextInput
            mode="flat"
            placeholder="Écrire un commentaire..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
            style={styles.textInput}
            underlineColor="transparent"
            theme={{
              colors: { primary: "#0D9488", placeholder: "#9CA3AF" },
              roundness: 12,
            }}
            right={
              <TextInput.Icon
                icon={() => (
                  <TouchableOpacity
                    onPress={handleAddComment}
                    disabled={isSubmitting || !newComment.trim()}
                    style={{ padding: 8 }}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#0D9488" />
                    ) : (
                      <MaterialCommunityIcons
                        name="send-circle"
                        size={32}
                        color={newComment.trim() ? "#0D9488" : "#CBD5E1"}
                      />
                    )}
                  </TouchableOpacity>
                )}
              />
            }
          />
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FAFAF5",
  },
  container: {
    flex: 1,
  },
  commentsWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 80,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  commentCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  commentBody: {
    flex: 1,
  },
  commentHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  username: {
    fontWeight: "700",
    fontSize: 13,
    color: "#1A1A2E",
    marginRight: 8,
  },
  timestamp: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  commentText: {
    fontSize: 14,
    color: "#1A1A2E",
    lineHeight: 20,
    marginBottom: 6,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    padding: 2,
  },
  inputBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0EB",
  },
  textInput: {
    backgroundColor: "#F5F5F0",
    borderRadius: 20,
    fontSize: 15,
    paddingHorizontal: 14,
    maxHeight: 100,
  },
});

export default CommentSection;
