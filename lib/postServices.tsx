import { Post } from "@/types/postTypes";
import { supabase } from "./supabase";

import { useQuery } from "@tanstack/react-query";

// Créer un fichier imageService.ts
import * as ImagePicker from "expo-image-picker";
import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system";

export const fetchPostDetails = async (postId: string) => {
  const { data, error } = await supabase
    .from("posts")
    .select("*, profiles(*), post_likes(*), comments(*)")
    .eq("id", postId)
    .single();

  if (error) throw error;
  return data as Post;
};

export const fetchComments = async (postId: string) => {
  const { data, error } = await supabase
    .from("comments")
    .select("*, profiles(*)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as Comment[];
};

export interface ImageAsset extends ImagePicker.ImagePickerAsset {
  id?: string;
}

export const uploadImages = async (images: ImageAsset[]) => {
  if (!images?.length) return [];

  try {
    return await Promise.all(
      images.map(async (image) => {
        if (!image.uri) throw new Error("URI image manquante");

        const base64 = await FileSystem.readAsStringAsync(image.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const arraybuffer = Buffer.from(base64, "base64");
        const fileExt = image.uri.split(".").pop()?.toLowerCase() || "jpeg";
        const path = `${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from("post-images")
          .upload(path, arraybuffer, {
            contentType: image.mimeType || "image/jpeg",
          });

        if (error) throw error;
        return data?.path;
      }),
    );
  } catch (error) {
    throw new Error(
      `Échec du téléversement : ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

export interface NotificationPayload {
  type: "like" | "comment" | "share";
  receiverId: string;
  senderId: string;
  postId: number;
  commentId?: number;
  content: string;
  metadata?: Record<string, unknown>;
}

export const createNotification = async (payload: NotificationPayload) => {
  try {
    const { data, error } = await supabase
      .from("posts_notifications")
      .insert({
        receiver_id: payload.receiverId,
        sender_id: payload.senderId,
        post_id: payload.postId,
        type: payload.type,
        data: {
          comment_id: payload.commentId,
          preview: payload.content.substring(0, 100),
          full_content: payload.content,
          post_id: payload.postId,
          ...payload.metadata,
        },
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erreur création notification:", error);
    throw error;
  }
};

export const useUnreadNotifications = (userId: string) => {
  return useQuery({
    queryKey: ["unread-notifications", userId],
    queryFn: async () => {
      const { count } = await supabase
        .from("posts_notifications")
        .select("*", { count: "exact" })
        .eq("receiver_id", userId)
        .eq("is_read", false);

      return count || 0;
    },
  });
};

// Exemple d'utilisation pour un commentaire
export const createCommentNotification = async (
  currentUser: { id: string; username: string; full_name: string },
  postOwnerId: string,
  postId: number,
  commentId: number,
  commentText: string,
) => {
  return createNotification({
    type: "comment",
    receiverId: postOwnerId,
    senderId: currentUser.id,
    postId: postId,
    commentId: commentId,
    content: `${
      currentUser.username || currentUser.full_name
    } a commenté : ${commentText}`,
    metadata: {
      interaction_type: "comment",
      timestamp: new Date().toISOString(),
    },
  });
};

export const fetchNotifications = async (user_id: string) => {
  try {
    const { data, error } = await supabase
      .from("posts_notifications")
      .select(`*, sender_id(*)`)
      .eq("receiver_id", user_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
  } finally {
  }
};
