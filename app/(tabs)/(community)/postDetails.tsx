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
        }
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
      <StatusBar style="dark" backgroundColor="#F5F8FD" />

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
          <Text style={styles.commentsTitle}>Commentaire(s)</Text>
          {comments?.map((comment) => (
            <View key={comment.id} style={styles.commentContainer}>
              {comment?.profiles?.avatar_url ? (
                comment.profiles.avatar_url.startsWith("https://") ? (
                  <Image
                    source={{ uri: comment.profiles.avatar_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <RemoteImage
                    path={comment.profiles.avatar_url}
                    fallback="profile-placeholder"
                    style={styles.avatar}
                  />
                )
              ) : (
                <CircleUserRound color="#666" size={wp("8%")} />
              )}
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <Text style={styles.username}>
                    {comment.profiles?.full_name ||
                      comment.profiles?.username ||
                      "Utilisateur"}
                  </Text>
                  <Text style={styles.timestamp}>
                    {timeAgo(comment.created_at)}
                  </Text>
                </View>
                <Text style={styles.commentText}>{comment.text}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Feather name="heart" size={16} color="#64748B" />
                    <Text style={styles.actionText}></Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Feather name="message-circle" size={16} color="#64748B" />
                  </TouchableOpacity>
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
              2000
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
  commentContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 5,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  username: {
    fontSize: hp("1.5%"),
    letterSpacing: 0.5,
    fontWeight: "bold",
    marginRight: 8,
  },
  timestamp: {
    fontSize: hp("1.2%"),
    color: "#64748B",
  },
  commentText: {
    fontSize: hp("1.4%"),
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  actions: {
    flexDirection: "row",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  actionText: {
    fontSize: hp("1.2%"),
    letterSpacing: 0.5,
    color: "#64748B",
    marginLeft: 4,
  },
});

export default PostDetails;
