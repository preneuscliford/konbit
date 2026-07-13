import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  Image,
  TouchableOpacity,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import PostsCard from "@/components/PostsCard";
import { useAuth } from "@/app/provider/AuthProvider";
import { ActivityIndicator } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import BackAppbar from "@/components/AppBar";
import { Post } from "@/types/postTypes";
import { fetchComments, fetchPostDetails } from "@/lib/postServices";
import Toast, { ToastHandles } from "@/components/Toast";
import moment from "moment";
import RemoteImage from "@/components/RemoteImage";
import Feather from "@expo/vector-icons/Feather";
import CommentInput from "@/components/InputFueldComment";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { timeAgo } from "@/utils/date";
import { CircleUserRound } from "lucide-react-native";

const PostDetails = () => {
  const { postId } = useLocalSearchParams();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const { userData } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const toastRef = useRef<ToastHandles>(null);

  const loadData = async () => {
    try {
      const [postData, commentsData] = await Promise.all([
        fetchPostDetails(postId as string),
        fetchComments(postId as string),
      ]);
      setPost(postData);
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
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          // ... (filtre ou autres options)
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      commentsSubscription.unsubscribe();
    };
  }, [postId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  console.log(comments);

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
            tintColor="#9333EA"
            colors={["#9333EA"]}
          />
        }
      >
        <PostsCard
          item={post}
          currentUser={userData}
          router={router}
          showMoreIcons={false}
        />

        {/* Zone scrollable pour la liste des commentaires */}
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
                    <Text style={styles.commentText}>
                      {comment.content || comment.text}
                    </Text>
                  </View>
                  <View style={styles.commentActions}>
                    <TouchableOpacity style={styles.commentActionBtn}>
                      <Feather name="heart" size={14} color="#9CA3AF" />
                      <Text style={styles.commentActionLabel}>J'aime</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.commentActionBtn}>
                      <Feather
                        name="message-circle"
                        size={14}
                        color="#9CA3AF"
                      />
                      <Text style={styles.commentActionLabel}>Répondre</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Zone d'input fixée en bas */}
      <CommentInput
        postId={postId as string}
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
    backgroundColor: "#F5F8FD",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100, // espace pour l'input
  },
  commentsWrapper: {
    marginTop: 16,
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
  commentActions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 6,
    paddingLeft: 4,
  },
  commentActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  commentActionLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
  },
});

export default PostDetails;
