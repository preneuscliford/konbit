import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  StyleSheet,
  View,
  Alert,
  Button,
  TouchableOpacity,
  Text,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Entypo } from "@expo/vector-icons";
import RemoteImage from "./RemoteImage";
import { Image } from "expo-image";
import { useAuth } from "@/app/provider/AuthProvider";

interface Props {
  size: number;
  url: string | null;
  onUpload: (filePath: string) => void;
}

export default function Avatar({ url, size = 150, onUpload }: Props) {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarSize = { height: size, width: size };
  const { userData } = useAuth();

  useEffect(() => {
    if (url) downloadImage(url);
  }, [url]);

  async function downloadImage(path: string) {
    try {
      const { data, error } = await supabase.storage
        .from("avatars")
        .download(path);

      if (error) {
        throw error;
      }

      const fr = new FileReader();
      fr.readAsDataURL(data);
      fr.onload = () => {
        setAvatarUrl(fr.result as string);
      };
    } catch (error) {
      if (error instanceof Error) {
        console.log("Error downloading image: ", error.message);
      }
    }
  }

  async function uploadAvatar() {
    try {
      setUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Restrict to only images
        allowsMultipleSelection: false, // Can only select one image
        allowsEditing: true, // Allows the user to crop / rotate their photo before uploading it
        quality: 1,
        exif: false, // We don't want nor need that data.
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log("User cancelled image picker.");
        return;
      }

      const image = result.assets[0];
      console.log("Got image", image);

      if (!image.uri) {
        throw new Error("No image uri!"); // Realistically, this should never happen, but just in case...
      }

      const arraybuffer = await fetch(image.uri).then((res) =>
        res.arrayBuffer()
      );

      const fileExt = image.uri?.split(".").pop()?.toLowerCase() ?? "jpeg";
      const path = `${Date.now()}.${fileExt}`;
      const { data, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, arraybuffer, {
          contentType: image.mimeType ?? "image/jpeg",
        });

      if (uploadError) {
        throw uploadError;
      }

      onUpload(data.path);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message);
      } else {
        throw error;
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <TouchableOpacity onPress={uploadAvatar}>
      {(avatarUrl && (
        <View className=" relative justify-center">
          <Entypo
            style={{ position: "absolute", alignSelf: "center", zIndex: 100 }}
            name="camera"
            size={50}
            color="#E5E5E5"
          />
          <Image
            source={{ uri: avatarUrl }}
            style={[avatarSize, styles.avatar, styles.image]}
          />
        </View>
      )) ||
      userData ? (
        <View className=" justify-center items-center">
          <Entypo
            style={{ position: "absolute", alignSelf: "center", zIndex: 100 }}
            name="camera"
            size={50}
            color="#E5E5E5"
          />
          {userData?.avatar_url?.startsWith("https://") ? (
            <Image
              source={{ uri: userData?.avatar_url }}
              style={[avatarSize, styles.avatar, styles.image]}
            />
          ) : (
            <RemoteImage
              path={userData?.avatar_url}
              fallback={"product image"}
              style={[avatarSize, styles.avatar, styles.image]}
            />
          )}
        </View>
      ) : (
        <View style={[avatarSize, styles.avatar, styles.noImage]}>
          <Entypo
            style={{ position: "absolute", alignSelf: "center", zIndex: 100 }}
            name="camera"
            size={50}
            color="#E5E5E5"
          />
        </View>
      )}
      <View>
        <Text> {uploading ? "Uploading ..." : ""}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 80,
    overflow: "hidden",
    maxWidth: "100%",
  },
  image: {
    objectFit: "cover",
    paddingTop: 0,
    zIndex: 0,
    opacity: 1,
  },
  noImage: {
    backgroundColor: "#333",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgb(200, 200, 200)",
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
  },
});
