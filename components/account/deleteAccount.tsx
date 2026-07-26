import React from "react";
import { Alert, TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/provider/AuthProvider";

const DeleteAccountButton: React.FC = () => {
  const router = useRouter();
  const { session } = useAuth();

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Confirmer la suppression",
      "Voulez-vous vraiment supprimer votre compte ? Cette action est irréversible.",
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              if (!session?.user.id) {
                throw new Error("Utilisateur non authentifié.");
              }

              // Suppression réelle du compte (auth.users + cascade sur toutes
              // les données liées) via une Edge Function service_role.
              const { error } = await supabase.functions.invoke(
                "delete-account",
              );
              if (error) throw error;

              await supabase.auth.signOut();

              Alert.alert(
                "Compte supprimé",
                "Votre compte a été supprimé avec succès."
              );
              router.replace("/(auth)/signIn");
            } catch (err: any) {
              Alert.alert("Erreur", err.message || "La suppression a échoué.");
            }
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleDeleteAccount}>
      <Text style={styles.buttonText}>Supprimer mon compte</Text>
    </TouchableOpacity>
  );
};

export default DeleteAccountButton;

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#EF4444", // Rouge pour la suppression
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 16,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
