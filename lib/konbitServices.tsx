import {
  Konbit,
  KonbitMediaItem,
  KonbitMessage,
  KonbitStatus,
  KonbitUpdate,
} from "@/types/konbitTypes";
import { supabase } from "./supabase";

import { useQuery } from "@tanstack/react-query";

import * as ImagePicker from "expo-image-picker";
import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system/legacy";

export const getKonbitMediaUrl = (path: string) =>
  supabase.storage.from("konbit-media").getPublicUrl(path).data.publicUrl;

export const fetchKonbitDetails = async (konbitId: string) => {
  const { data, error } = await supabase
    .from("konbits")
    .select(
      "*, profiles(*), konbit_participants(count), konbit_comments(count), konbit_likes(count)",
    )
    .eq("id", konbitId)
    .single();

  if (error) throw error;
  return data as Konbit;
};

export const fetchKonbitComments = async (konbitId: string) => {
  const { data, error } = await supabase
    .from("konbit_comments")
    .select("*, profiles(*)")
    .eq("konbit_id", konbitId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
};

export interface MediaAsset extends ImagePicker.ImagePickerAsset {
  id?: string;
}

export const uploadKonbitMedia = async (
  assets: MediaAsset[],
): Promise<KonbitMediaItem[]> => {
  if (!assets?.length) return [];

  try {
    return await Promise.all(
      assets.map(async (asset) => {
        if (!asset.uri) throw new Error("URI média manquante");

        const isVideo =
          asset.type === "video" || asset.mimeType?.startsWith("video");

        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const arraybuffer = Buffer.from(base64, "base64");
        const fileExt =
          asset.uri.split(".").pop()?.toLowerCase() ||
          (isVideo ? "mp4" : "jpeg");
        const path = `${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from("konbit-media")
          .upload(path, arraybuffer, {
            contentType:
              asset.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
          });

        if (error) throw error;
        return { path: data.path, type: isVideo ? "video" : "image" } as KonbitMediaItem;
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

export interface KonbitNotificationPayload {
  type: "join" | "help_offer" | "comment" | "like" | "status_change";
  receiverId: string;
  senderId: string;
  konbitId: number;
  commentId?: number;
  content: string;
  metadata?: Record<string, unknown>;
}

export const createKonbitNotification = async (
  payload: KonbitNotificationPayload,
) => {
  try {
    const { error } = await supabase.from("konbit_notifications").insert({
      receiver_id: payload.receiverId,
      sender_id: payload.senderId,
      konbit_id: payload.konbitId,
      type: payload.type,
      data: {
        comment_id: payload.commentId,
        preview: payload.content.substring(0, 100),
        full_content: payload.content,
        konbit_id: payload.konbitId,
        ...payload.metadata,
      },
    });

    if (error) throw error;
  } catch (error) {
    console.error("Erreur création notification:", error);
    throw error;
  }
};

export const useUnreadKonbitNotifications = (userId: string) => {
  return useQuery({
    queryKey: ["unread-konbit-notifications", userId],
    queryFn: async () => {
      const { count } = await supabase
        .from("konbit_notifications")
        .select("*", { count: "exact" })
        .eq("receiver_id", userId)
        .eq("read", false);

      return count || 0;
    },
    enabled: !!userId,
  });
};

export const createCommentNotification = async (
  currentUser: { id: string; username: string; full_name: string },
  konbitOwnerId: string,
  konbitId: number,
  commentId: number,
  commentText: string,
) => {
  return createKonbitNotification({
    type: "comment",
    receiverId: konbitOwnerId,
    senderId: currentUser.id,
    konbitId: konbitId,
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

export const fetchKonbitNotifications = async (user_id: string) => {
  try {
    const { data, error } = await supabase
      .from("konbit_notifications")
      .select(`*, sender_id(*)`)
      .eq("receiver_id", user_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
  }
};

export const joinKonbit = async (
  konbitId: number,
  userId: string,
  type: "participant" | "helper" = "participant",
  message?: string,
) => {
  const { error } = await supabase
    .from("konbit_participants")
    .insert({ konbit_id: konbitId, user_id: userId, type, message });
  if (error) throw error;
};

export const leaveKonbit = async (konbitId: number, userId: string) => {
  const { error } = await supabase
    .from("konbit_participants")
    .delete()
    .eq("konbit_id", konbitId)
    .eq("user_id", userId);
  if (error) throw error;
};

export const toggleBookmark = async (
  konbitId: number,
  userId: string,
  isBookmarked: boolean,
) => {
  if (isBookmarked) {
    const { error } = await supabase
      .from("konbit_bookmarks")
      .delete()
      .eq("konbit_id", konbitId)
      .eq("user_id", userId);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from("konbit_bookmarks")
    .insert({ konbit_id: konbitId, user_id: userId });
  if (error) throw error;
  return true;
};

const PROFILE_KONBIT_SELECT =
  "*, profiles(*), konbit_participants(count), konbit_comments(count)";

export const getJoinedKonbits = async (userId: string) => {
  const { data, error } = await supabase
    .from("konbit_participants")
    .select(`konbit_id, type, created_at, konbits(${PROFILE_KONBIT_SELECT})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || [])
    .map((row: any) => row.konbits)
    .filter(Boolean) as Konbit[];
};

export const getBookmarkedKonbits = async (userId: string) => {
  const { data, error } = await supabase
    .from("konbit_bookmarks")
    .select(`konbit_id, created_at, konbits(${PROFILE_KONBIT_SELECT})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || [])
    .map((row: any) => row.konbits)
    .filter(Boolean) as Konbit[];
};

export const updateKonbitStatus = async (
  konbitId: number,
  status: KonbitStatus,
) => {
  const { error } = await supabase
    .from("konbits")
    .update({ status })
    .eq("id", konbitId);
  if (error) throw error;
};

export const fetchKonbitParticipants = async (konbitId: number | string) => {
  const { data, error } = await supabase
    .from("konbit_participants")
    .select("id, user_id, type, message, created_at, profiles(*)")
    .eq("konbit_id", konbitId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
};

export const fetchKonbitUpdates = async (
  konbitId: number | string,
): Promise<KonbitUpdate[]> => {
  const { data, error } = await supabase
    .from("konbit_updates")
    .select("*, profiles(*)")
    .eq("konbit_id", konbitId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as KonbitUpdate[];
};

export const createKonbitUpdate = async (
  konbitId: number,
  userId: string,
  content: string,
) => {
  const { error } = await supabase
    .from("konbit_updates")
    .insert({ konbit_id: konbitId, user_id: userId, content });
  if (error) throw error;
};

export const fetchKonbitMessages = async (
  konbitId: number | string,
): Promise<KonbitMessage[]> => {
  const { data, error } = await supabase
    .from("konbit_messages")
    .select("*, profiles(*)")
    .eq("konbit_id", konbitId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as KonbitMessage[];
};

export const sendKonbitMessage = async (
  konbitId: number,
  userId: string,
  content: string | null,
  imagePath: string | null = null,
) => {
  const { error } = await supabase.from("konbit_messages").insert({
    konbit_id: konbitId,
    user_id: userId,
    content,
    image_path: imagePath,
  });
  if (error) throw error;
};

export const uploadKonbitChatImage = async (
  asset: MediaAsset,
): Promise<string> => {
  const [media] = await uploadKonbitMedia([asset]);
  return media.path;
};
