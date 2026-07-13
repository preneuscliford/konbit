import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Feather } from "@expo/vector-icons";
import { getProfile, useAuth } from "@/app/provider/AuthProvider";
import { ActivityIndicator } from "react-native-paper";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { timeAgo } from "@/utils/date";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchNotifications } from "@/lib/postServices";

const Notifications = () => {
  const { user, userData } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["posts_notifications"],
    queryFn: () =>
      user?.id ? fetchNotifications(user.id) : Promise.reject("No user ID"),
    enabled: !!user?.id, //
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("posts_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["posts_notifications"] as any);
    },
  });

  if (isLoading)
    return (
      <ActivityIndicator style={{ flex: 1, backgroundColor: "#F5F8FD" }} />
    );

  if (notifications?.length === 0)
    return (
      <SafeAreaView className="flex-1 bg-[#F5F8FD]">
        <Text className="text-center text-gray-500 mt-40">
          Aucune notification
        </Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView className="flex-1 bg-[#F5F8FD]">
      <ScrollView className="p-4 flex-1">
        {notifications?.map((notification: any) => (
          <View
            key={notification.id}
            className={`p-4 mb-3 rounded-lg ${
              !notification.is_read ? "bg-blue-50" : "bg-gray-50"
            }`}
          >
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-row items-center gap-2">
                <Feather
                  name={
                    notification.type === "like"
                      ? "heart"
                      : notification.type === "comment"
                      ? "message-circle"
                      : "users"
                  }
                  size={20}
                  color={notification.type === "like" ? "red" : " #6b7280"}
                />
                <Text className="font-medium">
                  {notification.sender?.username ||
                    notification.sender_id?.full_name}
                </Text>
              </View>
              <Text className="text-gray-500 text-xs">
                {timeAgo(notification.created_at)}
              </Text>
            </View>

            <Text className="text-gray-600">
              {notification.data?.preview || "Nouvelle interaction"}
            </Text>

            {!notification.is_read && (
              <TouchableOpacity
                onPress={() => markAsRead.mutate(notification.id)}
                className="mt-2 self-end"
              >
                <Text className="text-blue-500 text-xs">Marquer comme lu</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Notifications;
