import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Share,
  Animated,
  Modal,
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
import {
  createKonbitNotification,
  joinKonbit,
  leaveKonbit,
  toggleBookmark,
} from "@/lib/konbitServices";
import { CircleUserRound } from "lucide-react-native";
import { timeAgo } from "@/utils/date";
import Colors from "@/constants/Colors";
import { getCategoryConfig } from "./CategorySelector";

const COLORS = {
  text: Colors.text,
  textMuted: Colors.textMuted,
  primary: Colors.primary,
  accent: Colors.secondary,
  border: Colors.tabBarBorder,
  like: Colors.error,
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  nouvelle: { label: "Nouvelle", color: Colors.primary },
  en_preparation: { label: "En préparation", color: Colors.secondary },
  en_cours: { label: "En cours", color: Colors.secondary },
  terminee: { label: "Terminée", color: Colors.textMuted },
};

const KonbitCard = ({
  item,
  router,
  currentUser,
  showMoreIcons = true,
}: any) => {
  const [participants, setParticipants] = useState<any[]>([]);
  const [likes, setLikes] = useState<any[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinChoiceVisible, setJoinChoiceVisible] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;
  const { user } = useAuth();
  const channelRef = useRef<any>(null);
  // Nom de canal unique par instance montée : le même Konbit peut être
  // rendu simultanément dans plusieurs écrans (fil + profil, onglets
  // gardés montés), Supabase rejette un `.on()` sur un canal déjà
  // souscrit portant le même nom.
  const instanceIdRef = useRef(Math.random().toString(36).slice(2, 8));

  const myParticipation = participants?.find(
    (p: any) => p.user_id === currentUser?.id,
  );
  const joined = !!myParticipation;
  const liked = likes?.some((l: any) => l.user_id === currentUser?.id);
  const categoryMeta = getCategoryConfig(item?.category);
  const statusMeta = STATUS_CONFIG[item?.status] || STATUS_CONFIG.nouvelle;
  const participantsCount =
    item?.konbit_participants?.[0]?.count ?? participants.length;
  const commentsCount = item?.konbit_comments?.[0]?.count ?? 0;
  const isFull = Boolean(
    item?.participants_target && participantsCount >= item.participants_target,
  );

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

  const handleJoinPress = () => {
    if (isJoining || !currentUser?.id) return;
    if (joined) {
      handleLeave();
    } else {
      if (isFull) return;
      setJoinChoiceVisible(true);
    }
  };

  const handleLeave = async () => {
    setIsJoining(true);
    try {
      setParticipants(
        participants.filter((p: any) => p.user_id !== currentUser.id),
      );
      await leaveKonbit(item.id, currentUser.id);
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoin = async (type: "participant" | "helper") => {
    setJoinChoiceVisible(false);
    if (isJoining || !currentUser?.id) return;
    setIsJoining(true);
    try {
      setParticipants([
        ...participants,
        { konbit_id: item.id, user_id: currentUser.id, type },
      ]);
      await joinKonbit(item.id, currentUser.id, type);
      if (item.user_id && item.user_id !== currentUser.id) {
        await createKonbitNotification({
          type: "join",
          receiverId: item.user_id,
          senderId: currentUser.id,
          konbitId: item.id,
          content:
            type === "helper"
              ? `${currentUser.username || currentUser.full_name} propose son aide sur votre Konbit`
              : `${currentUser.username || currentUser.full_name} a rejoint votre Konbit`,
        });
      }
    } finally {
      setIsJoining(false);
    }
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
          .from("konbit_likes")
          .delete()
          .eq("user_id", currentUser.id)
          .eq("konbit_id", item.id);
      } else {
        setLikes([...likes, { konbit_id: item.id, user_id: currentUser.id }]);
        animateHeart();
        const { error } = await supabase
          .from("konbit_likes")
          .insert({ konbit_id: item.id, user_id: currentUser.id })
          .select()
          .single();
        if (!error && item.user_id && item.user_id !== currentUser.id) {
          await createKonbitNotification({
            type: "like",
            receiverId: item.user_id,
            senderId: currentUser.id,
            konbitId: item.id,
            content: `${currentUser.username || currentUser.full_name} soutient votre Konbit`,
          });
        }
      }
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async () => {
    if (isBookmarking || !currentUser?.id) return;
    setIsBookmarking(true);
    try {
      const nowBookmarked = await toggleBookmark(
        item.id,
        currentUser.id,
        isBookmarked,
      );
      setIsBookmarked(nowBookmarked);
    } finally {
      setIsBookmarking(false);
    }
  };

  useEffect(() => {
    if (item?.id)
      supabase
        .from("konbit_participants")
        .select("*")
        .eq("konbit_id", item.id)
        .then(({ data, error }) => {
          if (!error && data) setParticipants(data);
        });
  }, [item?.id]);

  useEffect(() => {
    if (item?.id)
      supabase
        .from("konbit_likes")
        .select("*")
        .eq("konbit_id", item.id)
        .then(({ data, error }) => {
          if (!error && data) setLikes(data);
        });
  }, [item?.id]);

  useEffect(() => {
    if (item?.id && currentUser?.id)
      supabase
        .from("konbit_bookmarks")
        .select("id")
        .eq("konbit_id", item.id)
        .eq("user_id", currentUser.id)
        .maybeSingle()
        .then(({ data }) => setIsBookmarked(!!data));
  }, [item?.id, currentUser?.id]);

  useEffect(() => {
    if (!item?.id || !showMoreIcons) return;
    if (channelRef.current) channelRef.current.unsubscribe();
    const channel = supabase.channel(
      `konbit-likes-${item.id}-${instanceIdRef.current}`,
    );
    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "konbit_likes",
          filter: `konbit_id=eq.${item.id}`,
        },
        async () => {
          const { data } = await supabase
            .from("konbit_likes")
            .select("*")
            .eq("konbit_id", item.id);
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
      message: `${item?.title}\n\n${(item?.description || "").replace(/<\/?[^>]+(>|$)/gm, "")}`,
    });
  };

  const images = (item?.media || [])
    .filter((m: any) => m.type === "image")
    .map((m: any) => m.path);

  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <View
          style={[
            styles.typeBadge,
            { backgroundColor: `${categoryMeta.color}15` },
          ]}
        >
          <MaterialCommunityIcons
            name={categoryMeta.icon as any}
            size={14}
            color={categoryMeta.color}
          />
          <Text style={[styles.typeLabel, { color: categoryMeta.color }]}>
            {categoryMeta.label}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${statusMeta.color}15` },
          ]}
        >
          <Text style={[styles.statusLabel, { color: statusMeta.color }]}>
            {statusMeta.label}
          </Text>
        </View>
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
            konbitId={item?.id}
            userId={item?.profiles?.id}
            currentUserId={user?.id as string}
          />
        )}
      </View>

      <Link
        href={{
          pathname: "/(community)/konbitDetails",
          params: { konbitId: item?.id },
        }}
        asChild
      >
        <TouchableOpacity>
          <Text style={styles.title} numberOfLines={2}>
            {item?.title}
          </Text>
          {item?.description ? (
            <Text style={styles.description} numberOfLines={3}>
              {item.description}
            </Text>
          ) : null}
        </TouchableOpacity>
      </Link>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Feather name="users" size={14} color={COLORS.textMuted} />
          <Text style={styles.metaText}>
            {item?.participants_target
              ? `${participantsCount}/${item.participants_target} participants`
              : `${participantsCount} participant${participantsCount > 1 ? "s" : ""}`}
          </Text>
        </View>
        {item?.location ? (
          <View style={styles.metaItem}>
            <Feather name="map-pin" size={14} color={COLORS.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
        ) : null}
        {item?.event_date ? (
          <View style={styles.metaItem}>
            <Feather name="calendar" size={14} color={COLORS.textMuted} />
            <Text style={styles.metaText}>
              {new Date(item.event_date).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              })}
            </Text>
          </View>
        ) : null}
      </View>

      {(item?.required_skills || item?.locals_only) && (
        <View style={styles.conditionsRow}>
          {item.locals_only ? (
            <View style={styles.conditionChip}>
              <Feather name="map-pin" size={11} color={COLORS.primary} />
              <Text style={styles.conditionText}>Local uniquement</Text>
            </View>
          ) : null}
          {item.required_skills ? (
            <View style={styles.conditionChip}>
              <Feather name="award" size={11} color={COLORS.primary} />
              <Text style={styles.conditionText} numberOfLines={1}>
                {item.required_skills}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {images.length > 0 && (
        <View style={styles.mediaWrap}>
          <ImageSlider images={images} />
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handleJoinPress}
          style={[
            styles.joinBtn,
            joined && styles.joinBtnActive,
            !joined && isFull && styles.joinBtnDisabled,
          ]}
          disabled={isJoining || (!joined && isFull)}
        >
          <Text style={[styles.joinBtnText, joined && styles.joinBtnTextActive]}>
            {joined
              ? myParticipation?.type === "helper"
                ? "✓ Aidant"
                : "✓ Participant"
              : isFull
                ? "Complet"
                : "Rejoindre"}
          </Text>
        </TouchableOpacity>

        <View style={styles.actionsRight}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <AntDesign
                name="heart"
                size={18}
                color={liked ? COLORS.like : COLORS.textMuted}
              />
            </Animated.View>
            <Text style={[styles.actionCount, liked && { color: COLORS.like }]}>
              {likes?.length || 0}
            </Text>
          </TouchableOpacity>
          <Link
            href={{
              pathname: "/(community)/konbitDetails",
              params: { konbitId: item?.id },
            }}
            asChild
          >
            <TouchableOpacity style={styles.actionBtn}>
              <Feather
                name="message-circle"
                size={18}
                color={COLORS.textMuted}
              />
              <Text style={styles.actionCount}>{commentsCount}</Text>
            </TouchableOpacity>
          </Link>
          <TouchableOpacity style={styles.actionBtn} onPress={handleBookmark}>
            <Feather
              name="bookmark"
              size={18}
              color={isBookmarked ? COLORS.primary : COLORS.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <MaterialCommunityIcons
              name="share-outline"
              size={18}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={joinChoiceVisible}
        onRequestClose={() => setJoinChoiceVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Comment souhaitez-vous participer ?</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => handleJoin("participant")}
            >
              <Text style={styles.modalButtonText}>Je participe</Text>
              <Text style={styles.modalButtonSub}>
                Je rejoins pleinement cette Konbit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => handleJoin("helper")}
            >
              <Text style={styles.modalButtonText}>Je peux aider</Text>
              <Text style={styles.modalButtonSub}>
                Je propose mon aide ponctuellement
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setJoinChoiceVisible(false)}
            >
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  typeLabel: { fontSize: 11, fontWeight: "700" },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusLabel: { fontSize: 11, fontWeight: "700" },
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
    borderColor: "#00209F",
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F0F0EB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#00209F",
  },
  nameCol: { justifyContent: "center" },
  username: { fontSize: 14, fontWeight: "700", color: "#1A1A2E" },
  time: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 12,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12, color: COLORS.textMuted, fontWeight: "600" },
  conditionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  conditionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: `${Colors.primary}10`,
    maxWidth: "100%",
  },
  conditionText: { fontSize: 11, fontWeight: "600", color: COLORS.primary },
  mediaWrap: { borderRadius: 14, overflow: "hidden", marginBottom: 12 },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0EB",
  },
  joinBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
  },
  joinBtnActive: {
    backgroundColor: "#EEF1FB",
  },
  joinBtnDisabled: {
    backgroundColor: "#E5E7EB",
  },
  joinBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  joinBtnTextActive: { color: COLORS.primary },
  actionsRight: { flexDirection: "row", alignItems: "center", gap: 14 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  actionCount: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 14,
    textAlign: "center",
  },
  modalButton: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalButtonText: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  modalButtonSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  cancelButton: { paddingVertical: 15, marginTop: 6 },
  cancelText: { fontSize: 15, color: COLORS.textMuted, textAlign: "center" },
});

export default KonbitCard;
