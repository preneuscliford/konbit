// CommentInput.tsx
import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import {
  createCommentNotification,
  createNotification,
} from "@/lib/postServices";
import { heightPercentageToDP } from "react-native-responsive-screen";

interface CommentInputProps {
  postId: string;
  currentUser: any;
  onCommentAdded: (success: boolean) => void;
}

const CommentInput: React.FC<CommentInputProps> = ({
  postId,
  currentUser,
  onCommentAdded,
}) => {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputScale = new Animated.Value(1);
  const router = useRouter();

  const animateInput = () => {
    Animated.sequence([
      Animated.timing(inputScale, {
        toValue: 0.95,
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
      const { data, error } = await supabase
        .from("comments")
        .insert({
          content: newComment.trim(),
          post_id: parseInt(postId, 10),
          user_id: currentUser.id,
        })
        .select()
        .single();

      if (error) throw error;

      setNewComment("");
      onCommentAdded(true);

      const { data: postOwner } = await supabase
        .from("posts")
        .select("user_id")
        .eq("id", parseInt(postId, 10))
        .single();

      if (postOwner?.user_id && postOwner.user_id !== currentUser.id) {
        await createCommentNotification(
          currentUser,
          postOwner.user_id,
          parseInt(postId, 10),
          data.id,
          newComment.trim(),
        );
      }
    } catch (error) {
      console.error("Erreur lors de l’ajout du commentaire:", error);
      onCommentAdded(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.inputContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Animated.View style={{ transform: [{ scale: inputScale }] }}>
        <TextInput
          mode="flat"
          placeholder="Écrire un commentaire..."
          value={newComment}
          onChangeText={setNewComment}
          multiline
          style={styles.input}
          underlineColor="transparent"
          theme={{
            colors: {
              primary: "#9333EA",
              placeholder: "#94A3B8",
            },
            roundness: 12,
          }}
          right={
            <TextInput.Icon
              icon={() => (
                <TouchableOpacity
                  onPress={handleAddComment}
                  disabled={isSubmitting || !newComment.trim()}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#9333EA" />
                  ) : (
                    <MaterialCommunityIcons
                      name="send-circle"
                      size={32}
                      color={newComment.trim() ? "#9333EA" : "#CBD5E1"}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          }
        />
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 24,
    fontSize: heightPercentageToDP("1.5%"),
    letterSpacing: 0.5,
    lineHeight: 24,
    paddingHorizontal: 16,
    maxHeight: 120,
  },
});

export default CommentInput;
