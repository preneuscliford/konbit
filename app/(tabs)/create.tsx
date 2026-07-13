import { useState, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Text, Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../provider/AuthProvider";
import { MaterialIcons } from "@expo/vector-icons";
import { useImagePicker } from "@/hooks/useImagePicker";
import { useRouter } from "expo-router";
import { uploadImages } from "@/lib/postServices";
import { supabase } from "@/lib/supabase";
import { Image } from "expo-image";
import CreateTypeSelector from "@/components/CreateTypeSelector";

const MAX_CHARACTERS = 500;

const CreatePost = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { images, pickImages, removeImage } = useImagePicker();
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("post");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) return;
    setIsSubmitting(true);
    try {
      const mediaUrls = await uploadImages(images);
      const { error } = await supabase.from("posts").insert({
        content: content.trim(),
        file: mediaUrls,
        user_id: user?.id,
        post_type: postType,
      });
      if (error) throw error;
      setContent("");
      router.navigate("/(tabs)");
    } catch (error) {
      console.error("Post error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeBtn}
          >
            <MaterialIcons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Créer</Text>
          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={isSubmitting || (!content && images.length === 0)}
            loading={isSubmitting}
            style={styles.publishBtn}
            labelStyle={styles.publishLabel}
          >
            Publier
          </Button>
        </View>

        <CreateTypeSelector selected={postType} onSelect={setPostType} />

        <TextInput
          ref={inputRef}
          placeholder="Quoi de neuf ?"
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={MAX_CHARACTERS}
          value={content}
          onChangeText={setContent}
          style={styles.input}
          autoFocus
        />

        {images.length > 0 && (
          <View style={styles.imageRow}>
            {images.map((img, i) => (
              <View key={i} style={styles.imgWrap}>
                <Image source={{ uri: img.uri }} style={styles.thumb} />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeImage(i)}
                >
                  <MaterialIcons name="close" size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity onPress={pickImages} style={styles.mediaBtn}>
            <MaterialIcons name="image" size={24} color="#0D9488" />
          </TouchableOpacity>
          <Text style={styles.counter}>{MAX_CHARACTERS - content.length}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF5" },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0EB",
  },
  closeBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A2E" },
  publishBtn: { borderRadius: 20, backgroundColor: "#0D9488" },
  publishLabel: { fontSize: 14, fontWeight: "600" },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: "#1A1A2E",
    padding: 16,
    textAlignVertical: "top",
  },
  imageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  imgWrap: { position: "relative", borderRadius: 10, overflow: "hidden" },
  thumb: { width: 80, height: 80, borderRadius: 10 },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    padding: 2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0EB",
  },
  mediaBtn: { padding: 4 },
  counter: { fontSize: 13, color: "#9CA3AF" },
});

export default CreatePost;
