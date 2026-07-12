import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/app/provider/AuthProvider";
import { Link, Stack, useNavigation, useRouter } from "expo-router";
import PostsCard from "@/components/PostsCard";
import NativeAdComponent from "@/components/NativeAdComponent";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  getNewPosts,
  getTrendingPosts,
  getUserPosts,
  PAGE_SIZE,
} from "@/lib/supabase";
import Animated from "react-native-reanimated";
import { Bell, ChartArea, Ratio, SquarePlus } from "lucide-react-native";
import { Appbar, Badge } from "react-native-paper";
import { Image } from "expo-image";
import RemoteImage from "@/components/RemoteImage";
import { useUnreadNotifications } from "@/lib/postServices";

const Index = () => {
  const { userData, user, session } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<
    "nouveaux" | "tendances" | "mesPosts"
  >("nouveaux");

  const { data: unreadCount } = useUnreadNotifications(user?.id || "");

  // Requête pour les nouveaux posts
  const newPostsQuery = useInfiniteQuery({
    queryKey: ["posts", "nouveaux"],
    queryFn: ({ pageParam }) => getNewPosts(pageParam),
    getNextPageParam: (lastPage, allPages) =>
      allPages.length * PAGE_SIZE < lastPage.totalCount
        ? allPages.length + 1
        : undefined,
    initialPageParam: 1,
    enabled: activeTab === "nouveaux",
  });

  // Requête pour les tendances
  const trendingPostsQuery = useInfiniteQuery({
    queryKey: ["posts", "tendances"],
    queryFn: ({ pageParam }) => getTrendingPosts(pageParam),
    getNextPageParam: (lastPage, allPages) =>
      allPages.length * PAGE_SIZE < lastPage.totalCount
        ? allPages.length + 1
        : undefined,
    initialPageParam: 1,
    enabled: activeTab === "tendances",
  });

  // Requête pour les posts utilisateur
  const userPostsQuery = useInfiniteQuery({
    queryKey: ["posts", "mesPosts", user?.id],
    queryFn: ({ pageParam }) => getUserPosts(pageParam, user?.id || ""),
    getNextPageParam: (lastPage, allPages) =>
      allPages.length * PAGE_SIZE < lastPage.totalCount
        ? allPages.length + 1
        : undefined,
    initialPageParam: 1,
    enabled: activeTab === "mesPosts" && !!user?.id,
  });

  // Sélection des données actives
  const activeQuery = {
    nouveaux: newPostsQuery,
    tendances: trendingPostsQuery,
    mesPosts: userPostsQuery,
  }[activeTab];

  const flattenedData =
    activeQuery.data?.pages.flatMap((page) => page.data) || [];

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        newPostsQuery.refetch(),
        trendingPostsQuery.refetch(),
        userPostsQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const renderPostItem = ({ item, index }: { item: any; index: number }) => {
    if (index > 0 && index % 5 === 0) {
      return (
        <>
          <NativeAdComponent key={`ad-${index}`} />
          <PostsCard
            key={`post-${item.id}`}
            item={item}
            router={router}
            currentUser={userData}
          />
        </>
      );
    }
    return (
      <PostsCard
        key={`post-${item.id}`}
        item={item}
        router={router}
        currentUser={userData}
      />
    );
  };

  return (
    <SafeAreaView className="h-full bg-ghost-white">
      <StatusBar style="dark" />
      <Appbar.Header style={{ backgroundColor: "#F5F8FD" }}>
        <Appbar.Content title="Feed" />

        <Appbar.Action
          icon={() => <SquarePlus size={24} color="#9333EA" />}
          onPress={() => router.push("/(tabs)/(community)/create")}
        />
        <Appbar.Action
          icon={() => (
            <View className="relative">
              <Bell size={24} color="#9333EA" />
              {unreadCount !== undefined && unreadCount > 0 && (
                <Badge
                  style={{ backgroundColor: "#EF4444" }}
                  className="absolute top-[-5] right-[-5] z-30"
                >
                  {unreadCount}
                </Badge>
              )}
            </View>
          )}
          onPress={() => router.push("/(tabs)/(community)/notifications")}
        />

        <Appbar.Action
          icon={() =>
            userData?.avatar_url?.startsWith("https://") ? (
              <Image
                source={{ uri: userData?.avatar_url }}
                style={{ width: 28, height: 28, borderRadius: 20 }}
              />
            ) : (
              <RemoteImage
                path={userData?.avatar_url}
                fallback="profile-placeholder"
                style={{ width: 28, height: 28, borderRadius: 20 }}
              />
            )
          }
          onPress={() => {}}
        />
      </Appbar.Header>

      {/* Barre d'onglets */}
      <View className="flex-row justify-between px-4 pt-4 border-b border-gray-100 mb-2">
        {(["nouveaux", "tendances", "mesPosts"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            className={`pb-4 px-2 ${
              activeTab === tab ? "border-b-2 border-purple-600" : ""
            }`}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-2">
              <Text
                className={`text-sm font-semibold ${
                  activeTab === tab ? "text-purple-600" : "text-gray-400"
                }`}
              >
                {
                  {
                    nouveaux: "Nouveaux",
                    tendances: "Tendances",
                    mesPosts: "Mes posts",
                  }[tab]
                }
              </Text>
              {activeTab === tab && (
                <View className="h-5 w-5 bg-purple-100 rounded-full items-center justify-center">
                  <Text className="text-purple-600 text-xs font-bold">
                    {flattenedData?.length}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contenu */}
      <Animated.View className="flex-1">
        <FlatList
          data={flattenedData}
          renderItem={renderPostItem}
          keyExtractor={(item) => item.id.toString()}
          onEndReached={() => {
            if (activeQuery.hasNextPage) {
              activeQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#9333EA"
              colors={["#9333EA"]}
            />
          }
          ListFooterComponent={
            activeQuery.isFetchingNextPage ? (
              <View className="py-4">
                <ActivityIndicator size="small" color="#9333EA" />
              </View>
            ) : !activeQuery.hasNextPage && flattenedData.length > 0 ? (
              <View className="py-4 items-center">
                <Text className="text-gray-500">Fin des résultats</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !activeQuery.isLoading ? (
              <View className="flex-1 items-center justify-center pt-20">
                <Text className="text-gray-500">
                  {activeTab === "mesPosts" && !user?.id
                    ? "Connectez-vous pour voir vos posts"
                    : "Aucun post trouvé"}
                </Text>
              </View>
            ) : null
          }
        />
      </Animated.View>

      {/* Chargement initial */}
      {activeQuery.isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#9333EA" />
        </View>
      )}
    </SafeAreaView>
  );
};

export default Index;

const styles = StyleSheet.create({});
