import { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  BackHandler,
} from "react-native";
import { Text, Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/app/provider/AuthProvider";
import { MaterialIcons } from "@expo/vector-icons";
import { useImagePicker } from "@/hooks/useImagePicker";
import { useRouter, Stack } from "expo-router";
import { uploadImages } from "@/lib/postServices";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { Image } from "expo-image";
import RemoteImage from "@/components/RemoteImage";
import { supabase } from "@/lib/supabase";

const MAX_CHARACTERS = 280;

const CreatePost = () => {
  const { user, userData } = useAuth();
  const router = useRouter();
  const { images, pickImages, removeImage } = useImagePicker();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) return;

    try {
      setIsSubmitting(true);
      const mediaUrls = await uploadImages(images);

      const { error } = await supabase.from("posts").insert({
        content: content.trim(),
        file: mediaUrls,
        user_id: user?.id,
      });

      if (error) throw error;
      router.back();
    } catch (error) {
      console.error("Post error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fonction pour confirmer l'abandon
  const confirmDiscard = () => {
    return new Promise((resolve) => {
      if (content.trim() || images.length > 0) {
        Alert.alert(
          "Abandonner la publication ?",
          "Votre brouillon sera perdu.",
          [
            {
              text: "Continuer l'édition",
              style: "cancel",
              onPress: () => resolve(false),
            },
            {
              text: "Abandonner",
              style: "destructive",
              onPress: () => {
                setContent("");
                resolve(true);
              },
            },
          ],
          { cancelable: false },
        );
      } else {
        resolve(true);
      }
    });
  };

  // Gérer le bouton retour physique (Android)
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        const handleBackPress = async () => {
          const shouldDiscard = await confirmDiscard();
          if (shouldDiscard) {
            router.back();
          }
        };
        handleBackPress();
        return true; // Retourne true pour bloquer l'action par défaut
      },
    );

    return () => backHandler.remove();
  }, [content, images]);

  // Modifier le gestionnaire de retour
  const handleBack = async () => {
    const shouldDiscard = await confirmDiscard();
    if (shouldDiscard) {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>

          <View style={styles.userInfo}>
            {userData?.avatar_url?.startsWith("https://") ? (
              <Image
                source={{ uri: userData.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <RemoteImage
                path={userData?.avatar_url}
                fallback="profile-placeholder"
                style={styles.avatar}
              />
            )}
            <Text style={styles.username}>
              {userData?.full_name || userData?.username}
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={isSubmitting || (!content && images.length === 0)}
            loading={isSubmitting}
            style={styles.postButton}
            labelStyle={styles.postButtonLabel}
          >
            Publier
          </Button>
        </View>

        <ScrollView
          style={styles.scrollView}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            ref={inputRef}
            placeholder="Quoi de neuf ?"
            placeholderTextColor="#666"
            multiline
            maxLength={MAX_CHARACTERS}
            value={content}
            onChangeText={setContent}
            style={styles.input}
            autoFocus
          />

          {images.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.mediaScroll}
              contentContainerStyle={styles.mediaContainer}
            >
              {images.map((image, index) => (
                <View key={index} style={styles.mediaItem}>
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.mediaPreview}
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <MaterialIcons name="close" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity onPress={pickImages} style={styles.mediaButton}>
            <MaterialIcons name="image" size={24} color="#9333EA" />
          </TouchableOpacity>

          <Text style={styles.counter}>{MAX_CHARACTERS - content.length}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: wp("4%"),
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  closeButton: {
    padding: wp("2%"),
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginLeft: wp("3%"),
  },
  avatar: {
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("5%"),
    marginRight: wp("2%"),
  },
  username: {
    fontSize: hp("1.8%"),
    fontWeight: "600",
    color: "#1F2937",
  },
  postButton: {
    borderRadius: wp("5%"),
    backgroundColor: "#9333EA",
  },
  postButtonLabel: {
    fontSize: hp("1.6%"),
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  input: {
    fontSize: hp("2%"),
    lineHeight: hp("2.8%"),
    color: "#1F2937",
    padding: wp("4%"),
    minHeight: hp("20%"),
    textAlignVertical: "top",
  },
  mediaScroll: {
    maxHeight: hp("20%"),
  },
  mediaContainer: {
    padding: wp("4%"),
    gap: wp("2%"),
  },
  mediaItem: {
    position: "relative",
    borderRadius: wp("3%"),
    overflow: "hidden",
  },
  mediaPreview: {
    width: wp("25%"),
    height: wp("25%"),
  },
  removeButton: {
    position: "absolute",
    top: wp("2%"),
    right: wp("2%"),
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: wp("3%"),
    padding: wp("1%"),
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: wp("4%"),
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  mediaButton: {
    padding: wp("2%"),
  },
  counter: {
    fontSize: hp("1.6%"),
    color: "#6B7280",
  },
});

export default CreatePost;
