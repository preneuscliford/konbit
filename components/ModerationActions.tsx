import { useState } from "react";
import {
  Alert,
  Modal,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { Feather } from "@expo/vector-icons";

export const ModerationActions = ({
  konbitId,
  userId,
  currentUserId,
}: {
  konbitId: string;
  userId: string;
  currentUserId?: string;
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleReport = async (reason: string) => {
    const { error } = await supabase.from("reported_konbits").insert({
      konbit_id: konbitId,
      reporter_id: currentUserId,
      reason,
    });

    if (!error) Alert.alert("Signalement envoyé");
    setModalVisible(false);
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from("konbits")
      .delete()
      .eq("id", konbitId);

    if (!error) Alert.alert("Konbit supprimée");
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity onPress={() => setModalVisible(true)}>
        <Feather name="more-vertical" size={20} color="#6B7280" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {userId === currentUserId ? (
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleDelete}
              >
                <Text style={styles.deleteText}>Supprimer la Konbit</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.modalTitle}>Signaler la Konbit</Text>
                {["Spam", "Contenu inapproprié", "Harcèlement"].map(
                  (reason) => (
                    <TouchableOpacity
                      key={reason}
                      style={styles.modalButton}
                      onPress={() => handleReport(reason)}
                    >
                      <Text style={styles.reportText}>{reason}</Text>
                    </TouchableOpacity>
                  )
                )}
              </>
            )}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    textAlign: "center",
  },
  modalButton: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  reportText: {
    fontSize: 16,
    color: "#1F2937",
  },
  deleteText: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "500",
  },
  cancelButton: {
    paddingVertical: 15,
    marginTop: 10,
  },
  cancelText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
});
