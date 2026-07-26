import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import DeleteAccountButton from "@/components/account/deleteAccount";
import Colors from "@/constants/Colors";

const SettingsScreen = () => {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/signIn");
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compte</Text>
        <TouchableOpacity style={styles.row} onPress={handleSignOut}>
          <View style={styles.rowIcon}>
            <Feather name="log-out" size={18} color={Colors.text} />
          </View>
          <Text style={styles.rowText}>Se déconnecter</Text>
          <Feather name="chevron-right" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: Colors.error }]}>
          Zone dangereuse
        </Text>
        <View style={styles.card}>
          <Text style={styles.dangerText}>
            La suppression de votre compte est définitive : votre profil, vos
            Konbits, vos messages et toutes vos données seront
            irrémédiablement supprimés.
          </Text>
          <DeleteAccountButton />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceWarm },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  rowText: { flex: 1, fontSize: 15, fontWeight: "600", color: Colors.text },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  dangerText: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 19,
  },
});

export default SettingsScreen;
