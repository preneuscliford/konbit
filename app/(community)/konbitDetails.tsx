import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  Image,
  TouchableOpacity,
  TextInput,
} from "react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import KonbitCard from "@/components/KonbitCard";
import { useAuth } from "@/app/provider/AuthProvider";
import { ActivityIndicator } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import BackAppbar from "@/components/AppBar";
import { Konbit, KonbitStatus } from "@/types/konbitTypes";
import {
  fetchKonbitComments,
  fetchKonbitDetails,
  fetchKonbitParticipants,
  fetchKonbitUpdates,
  createKonbitUpdate,
  updateKonbitStatus,
} from "@/lib/konbitServices";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Toast, { ToastHandles } from "@/components/Toast";
import RemoteImage from "@/components/RemoteImage";
import Feather from "@expo/vector-icons/Feather";
import CommentInput from "@/components/InputFueldComment";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import { timeAgo } from "@/utils/date";
import { CircleUserRound } from "lucide-react-native";
import Colors from "@/constants/Colors";

const STATUS_STEPS: { key: KonbitStatus; label: string }[] = [
  { key: "nouvelle", label: "Nouvelle" },
  { key: "en_preparation", label: "En préparation" },
  { key: "en_cours", label: "En cours" },
  { key: "terminee", label: "Terminée" },
];

const KonbitDetails = () => {
  const { konbitId } = useLocalSearchParams();
  const [konbit, setKonbit] = useState<Konbit | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const { userData, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const toastRef = useRef<ToastHandles>(null);
  // Suffixe unique par instance montée : évite un conflit de canal si le
  // même écran de détail se retrouve monté deux fois en même temps.
  const instanceId = useMemo(() => Math.random().toString(36).slice(2, 8), []);

  const isCreator = !!konbit && konbit.user_id === user?.id;

  const { data: participants } = useQuery({
    queryKey: ["konbit-participants", konbitId],
    queryFn: () => fetchKonbitParticipants(konbitId as string),
    enabled: !!konbitId,
  });

  const { data: updates } = useQuery({
    queryKey: ["konbit-updates", konbitId],
    queryFn: () => fetchKonbitUpdates(konbitId as string),
    enabled: !!konbitId,
  });

  const isMember =
    isCreator ||
    !!participants?.some((p: any) => p.user_id === user?.id);

  const handleStatusChange = async (status: KonbitStatus) => {
    if (!konbit || isChangingStatus || status === konbit.status) return;
    setIsChangingStatus(true);
    try {
      await updateKonbitStatus(konbit.id as unknown as number, status);
      setKonbit({ ...konbit, status });
    } catch (error) {
      toastRef.current?.show("Impossible de changer le statut", "error", 2000);
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handlePostUpdate = async () => {
    if (!updateText.trim() || isPostingUpdate || !user?.id || !konbit) return;
    setIsPostingUpdate(true);
    try {
      await createKonbitUpdate(
        konbit.id as unknown as number,
        user.id,
        updateText.trim(),
      );
      setUpdateText("");
      queryClient.invalidateQueries({ queryKey: ["konbit-updates", konbitId] });
    } catch (error) {
      toastRef.current?.show("Échec de la publication", "error", 2000);
    } finally {
      setIsPostingUpdate(false);
    }
  };

  const loadData = async () => {
    try {
      const [konbitData, commentsData] = await Promise.all([
        fetchKonbitDetails(konbitId as string),
        fetchKonbitComments(konbitId as string),
      ]);
      setKonbit(konbitData);
      setComments(commentsData);
    } catch (error) {
      Alert.alert("Erreur", error as string);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  useEffect(() => {
    loadData();

    const commentsSubscription = supabase
      .channel(`konbit-comments-${konbitId}-${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "konbit_comments",
          filter: `konbit_id=eq.${konbitId}`,
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      commentsSubscription.unsubscribe();
    };
  }, [konbitId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <Toast ref={toastRef} />
      <BackAppbar title="" />
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#00209F"
            colors={["#00209F"]}
          />
        }
      >
        <KonbitCard
          item={konbit}
          currentUser={userData}
          router={router}
          showMoreIcons={false}
        />

        {isCreator && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statut de la Konbit</Text>
            <View style={styles.statusRow}>
              {STATUS_STEPS.map((step) => {
                const active = konbit?.status === step.key;
                return (
                  <TouchableOpacity
                    key={step.key}
                    style={[styles.statusPill, active && styles.statusPillActive]}
                    onPress={() => handleStatusChange(step.key)}
                    disabled={isChangingStatus}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        active && styles.statusPillTextActive,
                      ]}
                    >
                      {step.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Participants{participants?.length ? ` (${participants.length})` : ""}
          </Text>
          {participants?.length ? (
            <View style={styles.participantsList}>
              {participants.map((p: any) => (
                <View key={p.id} style={styles.participantRow}>
                  {p.profiles?.avatar_url ? (
                    p.profiles.avatar_url.startsWith("https://") ? (
                      <Image
                        source={{ uri: p.profiles.avatar_url }}
                        style={styles.participantAvatar}
                      />
                    ) : (
                      <RemoteImage
                        path={p.profiles.avatar_url}
                        fallback="profile-placeholder"
                        style={styles.participantAvatar}
                      />
                    )
                  ) : (
                    <View style={styles.participantAvatarPlaceholder}>
                      <CircleUserRound color="#9CA3AF" size={18} />
                    </View>
                  )}
                  <Text style={styles.participantName} numberOfLines={1}>
                    {p.profiles?.full_name || p.profiles?.username}
                  </Text>
                  <View
                    style={[
                      styles.participantTypeBadge,
                      p.type === "helper" && styles.participantTypeBadgeHelper,
                    ]}
                  >
                    <Text style={styles.participantTypeText}>
                      {p.type === "helper" ? "Aide proposée" : "Participant"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>Aucun participant pour l'instant</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mises à jour</Text>
          {isCreator && (
            <View style={styles.updateInputRow}>
              <TextInput
                value={updateText}
                onChangeText={setUpdateText}
                placeholder="Partagez l'avancement de votre Konbit..."
                placeholderTextColor={Colors.textMuted}
                style={styles.updateInput}
                multiline
              />
              <TouchableOpacity
                onPress={handlePostUpdate}
                disabled={isPostingUpdate || !updateText.trim()}
                style={[
                  styles.updateSendBtn,
                  (isPostingUpdate || !updateText.trim()) && { opacity: 0.5 },
                ]}
              >
                <Feather name="send" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
          {updates?.length ? (
            updates.map((u) => (
              <View key={u.id} style={styles.updateCard}>
                <View style={styles.updateHead}>
                  <Text style={styles.updateAuthor}>
                    {u.profiles?.full_name || u.profiles?.username}
                  </Text>
                  <Text style={styles.updateTime}>{timeAgo(u.created_at)}</Text>
                </View>
                <Text style={styles.updateContent}>{u.content}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Aucune mise à jour pour l'instant</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discussion</Text>
          {isMember ? (
            <TouchableOpacity
              style={styles.discussionBtn}
              onPress={() =>
                router.push({
                  pathname: "/(community)/konbitChat",
                  params: { konbitId: konbit?.id },
                })
              }
            >
              <Feather name="message-square" size={16} color="#FFFFFF" />
              <Text style={styles.discussionBtnText}>Ouvrir la discussion</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.emptyText}>
              Rejoignez la Konbit pour accéder à la discussion
            </Text>
          )}
        </View>

        <View style={styles.commentsWrapper}>
          <Text style={styles.commentsTitle}>Commentaires</Text>
          {comments?.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <View style={styles.commentRow}>
                {comment?.profiles?.avatar_url ? (
                  comment.profiles.avatar_url.startsWith("https://") ? (
                    <Image
                      source={{ uri: comment.profiles.avatar_url }}
                      style={styles.commentAvatar}
                    />
                  ) : (
                    <RemoteImage
                      path={comment.profiles.avatar_url}
                      fallback="profile-placeholder"
                      style={styles.commentAvatar}
                    />
                  )
                ) : (
                  <View style={styles.commentAvatarPlaceholder}>
                    <CircleUserRound color="#9CA3AF" size={20} />
                  </View>
                )}
                <View style={styles.commentBody}>
                  <View style={styles.commentBubble}>
                    <View style={styles.commentHead}>
                      <Text style={styles.commentUsername}>
                        {comment.profiles?.full_name ||
                          comment.profiles?.username ||
                          "Utilisateur"}
                      </Text>
                      <Text style={styles.commentTime}>
                        {timeAgo(comment.created_at)}
                      </Text>
                    </View>
                    <Text style={styles.commentText}>{comment.content}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <CommentInput
        konbitId={konbitId as string}
        currentUser={userData}
        onCommentAdded={(success: any) => {
          if (success) {
            loadData();
            toastRef.current?.show("Commentaire ajouté", "success", 1500);
          } else {
            toastRef.current?.show(
              "Échec de l'ajout du commentaire",
              "error",
              2000,
            );
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FAFAF5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    paddingHorizontal: 0,
    paddingBottom: 100,
  },
  commentsWrapper: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  commentsTitle: {
    fontSize: hp("2%"),
    letterSpacing: 0.5,
    fontWeight: "bold",
    marginBottom: 12,
  },
  commentCard: {
    marginBottom: 12,
  },
  commentRow: {
    flexDirection: "row",
    gap: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F0EB",
    justifyContent: "center",
    alignItems: "center",
  },
  commentBody: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  commentHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  commentTime: {
    fontSize: 11,
    color: "#9CA3AF",
    marginLeft: 8,
  },
  commentText: {
    fontSize: 14,
    color: "#1A1A2E",
    lineHeight: 20,
  },
  section: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 8,
    borderTopColor: "#F5F5F0",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  emptyText: { fontSize: 13, color: Colors.textMuted },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "#F0F0EB",
  },
  statusPillActive: { backgroundColor: Colors.primary },
  statusPillText: { fontSize: 13, fontWeight: "600", color: Colors.textMuted },
  statusPillTextActive: { color: "#FFFFFF" },
  participantsList: { gap: 10 },
  participantRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  participantAvatar: { width: 34, height: 34, borderRadius: 17 },
  participantAvatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F0F0EB",
    justifyContent: "center",
    alignItems: "center",
  },
  participantName: { flex: 1, fontSize: 14, fontWeight: "600", color: Colors.text },
  participantTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: `${Colors.primary}15`,
  },
  participantTypeBadgeHelper: { backgroundColor: `${Colors.secondary}15` },
  participantTypeText: { fontSize: 11, fontWeight: "600", color: Colors.textMuted },
  updateInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 14,
  },
  updateInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: "#F7F7F2",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
  },
  updateSendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  updateCard: {
    backgroundColor: "#F7F7F2",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  updateHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  updateAuthor: { fontSize: 13, fontWeight: "700", color: Colors.text },
  updateTime: { fontSize: 11, color: Colors.textMuted },
  updateContent: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  discussionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
  },
  discussionBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});

export default KonbitDetails;
