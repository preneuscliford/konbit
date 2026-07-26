import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { CircleUserRound } from "lucide-react-native";
import SearchInput from "./SearchInput";
import RemoteImage from "./RemoteImage";
import { Image } from "expo-image";
import { useAuth } from "@/app/provider/AuthProvider";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import NotificationBell from "./NotificationBell";

const Header = () => {
  const { userData, session } = useAuth();
  const router = useRouter();

  const handleSearchPress = () => {
    router.push("/(tabs)/explore");
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.topRow}>
        {/* Left: Avatar + Welcome */}
        <View style={styles.userSection}>
          {session ? (
            <>
              {userData?.avatar_url ? (
                userData.avatar_url.startsWith("https://") ? (
                  <Image
                    source={{ uri: userData.avatar_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <RemoteImage
                    path={userData.avatar_url}
                    fallback="profile-placeholder"
                    style={styles.avatar}
                  />
                )
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <CircleUserRound color="#9CA3AF" size={28} />
                </View>
              )}
              <View style={styles.userInfo}>
                <Text style={styles.greeting}>Bonjour</Text>
                <Text style={styles.username} numberOfLines={1}>
                  {userData?.full_name || userData?.username || "Utilisateur"}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.avatarPlaceholder}>
                <CircleUserRound color="#9CA3AF" size={28} />
              </View>
              <TouchableOpacity onPress={() => router.push("/(auth)/signIn")}>
                <Text style={styles.signInLink}>Se connecter</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        {session ? <NotificationBell /> : null}
      </View>

      {/* Search Bar */}
      <TouchableOpacity
        style={styles.searchWrapper}
        onPress={handleSearchPress}
        activeOpacity={0.8}
      >
        <View pointerEvents="none">
          <SearchInput />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FAFAF5",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#0D9488",
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0F0EB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0D9488",
  },
  userInfo: {
    justifyContent: "center",
  },
  greeting: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  username: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A2E",
    maxWidth: wp("40%"),
  },
  signInLink: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0D9488",
  },
  searchWrapper: {
    width: "100%",
  },
});

export default Header;
