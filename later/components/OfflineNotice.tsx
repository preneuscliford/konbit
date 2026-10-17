import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { useOnlineManager } from "@/hooks/useOnlineManager";
import { useNetInfo } from "@react-native-community/netinfo";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import { WifiOff } from "lucide-react-native";

const OfflineNotice = () => {
  const netInfo = useNetInfo();

  if (netInfo.isConnected && netInfo.isInternetReachable) {
    return null;
  }

  return (
    <View style={styles.offlineContainer}>
      <WifiOff size={24} color="white" />
      <Text style={styles.offlineText}>Pas de connexion Internet</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  offlineContainer: {
    position: "absolute",
    top: 40,
    width: "100%",
    backgroundColor: "rgba(227, 0, 0, 0.7)",
    padding: hp("1%"),
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    zIndex: 1000,
  },
  offlineText: {
    color: "#ffffff",
    fontSize: hp("1.8%"),
    fontWeight: "500",
  },
});

export default OfflineNotice;
