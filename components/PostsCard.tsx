import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Share,
  Animated,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { AntDesign, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import RemoteImage from "./RemoteImage";
import { supabase } from "@/lib/supabase";
import { Link } from "expo-router";
import { ModerationActions } from "./ModerationActions";
import { Image } from "expo-image";
import ImageSlider from "./ImageSlider";
import { useAuth } from "@/app/provider/AuthProvider";
import { createNotification } from "@/lib/postServices";
import { CircleUserRound } from "lucide-react-native";
import { timeAgo } from "@/utils/date";
import HashtagText from "./HashtagText";

const COLORS = {
  text: "#1A1A2E",
  textMuted: "#6B7280",
  primary: "#0D9488",
  accent: "#F97316",
  border: "#F0F0EB",
  like: "#EF4444",
};

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  post: { label: "Publication", icon: "text", color: "#0D9488" },
  help: { label: "Demande d'aide", icon: "hand-heart", color: "#F97316" },
  announce: { label: "Annonce", icon: "bullhorn", color: "#6366F1" },
  event: { label: "Événement", icon: "calendar-star", color: "#EC4899" },
};

const PostsCard = ({
  item,
  router,
  currentUser,
  hasShadow = true,
  showMoreIcons = true,
}: any) => {
  const [likes, setLikes] = useState<any[]>([]);
  const [isLiking, setIsLiking] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;
  const { user } = useAuth();
  const channelRef = useRef<any>(null);
  const liked = likes?.some((like: any) => like.user_id === currentUser?.id);
  const postType = item?.post_type || "post";
  const typeMeta = TYPE_CONFIG[postType] || TYPE_CONFIG.post;

  const animateHeart = () => {
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.5,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleLike = async () => {
    if (isLiking || !currentUser?.id) return;
    setIsLiking(true);
    try {
      if (liked) {
        const updatedLikes = likes.filter(
          (l: any) => l.user_id !== currentUser.id,
        );
        setLikes(updatedLikes);
        await supabase
          .from("post_likes")
          .delete()
          .eq("user_id", currentUser.id)
          .eq("post_id", item.id);
      } else {
        setLikes([...likes, { post_id: item.id, user_id: currentUser.id }]);
        animateHeart();
        const { error } = await supabase
          .from("post_likes")
          .insert({ post_id: item.id, user_id: currentUser.id })
          .select()
          .single();
        if (!error) {
          const { data: postOwner } = await supabase
            .from("posts")
            .select("user_id")
            .eq("id", item.id)
            .single();
          if (postOwner?.user_id && postOwner.user_id !== currentUser.id) {
            await createNotification({
              type: "like",
              receiverId: postOwner.user_id,
              senderId: currentUser.id,
              postId: parseInt(item.id, 10),
              content: `${currentUser.username || currentUser.full_name} a aimé votre publication`,
              metadata: { interaction_type: "like" },
            });
          }
        }
      }
    } finally {
      setIsLiking(false);
    }
  };

  useEffect(() => {
    if (item?.id)
      supabase
        .from("post_likes")
        .select("*")
        .eq("post_id", item.id)
        .then(({ data, error }) => {
          if (!error && data) setLikes(data);
        });
  }, [item?.id]);

  useEffect(() => {
    if (!item?.id || !showMoreIcons) return;
    if (channelRef.current) channelRef.current.unsubscribe();
    const name = `post-likes-${item.id}-${Math.random().toString(36).slice(2, 6)}`;
    const channel = supabase.channel(name);
    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_likes",
          filter: `post_id=eq.${item.id}`,
        },
        async () => {
          const { data } = await supabase
            .from("post_likes")
            .select("*")
            .eq("post_id", item.id);
          if (data) setLikes(data);
        },
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [item?.id, showMoreIcons]);

  const handleShare = async () => {
    Share.share({
      message: (item?.content || "").replace(/<\/?[^>]+(>|$)/gm, ""),
    });
  };
  const content = item?.content || item?.body;

  return (
    <View style={styles.card}>
      {/* Type badge */}
      <View
        style={[styles.typeBadge, { backgroundColor: `${typeMeta.color}15` }]}
      >
        <MaterialCommunityIcons
          name={typeMeta.icon as any}
          size={14}
          color={typeMeta.color}
        />
        <Text style={[styles.typeLabel, { color: typeMeta.color }]}>
          {typeMeta.label}
        </Text>
      </View>

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.profileRow}
          onPress={() =>
            router.push({
              pathname: "/(community)/profile/[id]",
              params: { id: item?.profiles?.id },
            })
          }
        >
          {item?.profiles?.avatar_url ? (
            item.profiles.avatar_url.startsWith("https://") ? (
              <Image
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
              <CircleUserRound color="#9CA3AF" size={24} />
            </View>
          )}
          <View style={styles.nameCol}>
            <Text style={styles.username} numberOfLines={1}>
              {item?.profiles?.username || item?.profiles?.full_name}
            </Text>
            <Text style={styles.time}>{timeAgo(item?.created_at)}</Text>
          </View>
        </TouchableOpacity>
        {showMoreIcons && (
          <ModerationActions
            postId={item?.id}
            userId={item?.profiles?.id}
            currentUserId={user?.id as string}
          />
        )}
      </View>

      {content ? (
        <View style={styles.body}>
          <HashtagText text={content} style={styles.contentText} />
        </View>
      ) : null}
      {item?.file?.length > 0 && (
        <View style={styles.mediaWrap}>
          <ImageSlider images={item.file} />
        </View>
      )}

      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <AntDesign
                name="heart"
                size={20}
                color={liked ? COLORS.like : COLORS.textMuted}
              />
            </Animated.View>
            <Text style={[styles.actionCount, liked && { color: COLORS.like }]}>
              {likes?.length || 0}
            </Text>
          </TouchableOpacity>
          <Link
            href={{
              pathname: "/(community)/postDetails",
              params: { postId: item?.id },
            }}
            asChild
          >
            <TouchableOpacity style={styles.actionBtn}>
              <Feather
                name="message-circle"
                size={20}
                color={COLORS.textMuted}
              />
              <Text style={styles.actionCount}>
                {item?.comments?.length || 0}
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
        <View style={styles.actionsRight}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <MaterialCommunityIcons
              name="share-outline"
              size={20}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Feather name="bookmark" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 10,
  },
  typeLabel: { fontSize: 11, fontWeight: "700" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: "#0D9488",
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F0F0EB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0D9488",
  },
  nameCol: { justifyContent: "center" },
  username: { fontSize: 14, fontWeight: "700", color: "#1A1A2E" },
  time: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },
  body: { marginBottom: 12 },
  contentText: { fontSize: 15, lineHeight: 22, color: "#1A1A2E" },
  mediaWrap: { borderRadius: 14, overflow: "hidden", marginBottom: 12 },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0EB",
  },
  actionsLeft: { flexDirection: "row", alignItems: "center", gap: 18 },
  actionsRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  actionCount: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
});

export default PostsCard;
