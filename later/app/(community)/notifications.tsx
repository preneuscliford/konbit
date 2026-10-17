import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/app/provider/AuthProvider";
import { useRouter } from "expo-router";
import { ActivityIndicator } from "react-native-paper";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { timeAgo } from "@/utils/date";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchKonbitNotifications } from "@/lib/konbitServices";
import Colors from "@/constants/Colors";

const NOTIFICATION_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  join: "user-plus",
  help_offer: "life-buoy",
  comment: "message-circle",
  like: "heart",
  status_change: "flag",
};

const Notifications = () => {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["konbit_notifications"],
    queryFn: () =>
      user?.id
        ? fetchKonbitNotifications(user.id)
        : Promise.reject("No user ID"),
    enabled: !!user?.id,
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("konbit_notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["konbit_notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["unread-konbit-notifications", user?.id],
      });
    },
  });

  if (isLoading)
    return (
      <ActivityIndicator
        style={{ flex: 1, backgroundColor: Colors.surfaceWarm }}
      />
    );

  if (notifications?.length === 0)
    return (
      <SafeAreaView className="flex-1 bg-surface-warm">
        <Text className="text-center text-charcoal-muted mt-40">
          Aucune notification
        </Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView className="flex-1 bg-surface-warm">
      <ScrollView className="p-4 flex-1">
        {notifications?.map((notification: any) => (
          <TouchableOpacity
            key={notification.id}
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: "/(community)/konbitDetails",
                params: { konbitId: notification.konbit_id },
              })
            }
            className={`p-4 mb-3 rounded-2xl ${
              !notification.read ? "bg-primary-50" : "bg-surface-muted"
            }`}
          >
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-row items-center gap-2">
                <Feather
                  name={NOTIFICATION_ICONS[notification.type] || "bell"}
                  size={20}
                  color={
                    notification.type === "like"
                      ? Colors.error
                      : Colors.textMuted
                  }
                />
                <Text className="font-medium text-charcoal">
                  {notification.sender_id?.username ||
                    notification.sender_id?.full_name}
                </Text>
              </View>
              <Text className="text-charcoal-muted text-xs">
                {timeAgo(notification.created_at)}
              </Text>
            </View>

            <Text className="text-charcoal-muted">
              {notification.data?.preview || "Nouvelle interaction"}
            </Text>

            {!notification.read && (
              <TouchableOpacity
                onPress={() => markAsRead.mutate(notification.id)}
                className="mt-2 self-end"
              >
                <Text className="text-primary text-xs">Marquer comme lu</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Notifications;
