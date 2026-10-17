import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

interface AlertDialogProps {
  isVisible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AlertDialog = ({
  isVisible,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: AlertDialogProps) => {
  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dialog: {
    backgroundColor: "white",
    borderRadius: wp("4%"),
    padding: wp("5%"),
    width: wp("80%"),
  },
  title: {
    fontSize: hp("2.2%"),
    fontWeight: "600",
    marginBottom: hp("1%"),
  },
  message: {
    fontSize: hp("1.8%"),
    color: "#4B5563",
    marginBottom: hp("2%"),
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: wp("2%"),
  },
  button: {
    paddingVertical: hp("1%"),
    paddingHorizontal: wp("4%"),
    borderRadius: wp("2%"),
  },
  cancelButton: {
    backgroundColor: "#E5E7EB",
  },
  confirmButton: {
    backgroundColor: "#EF4444",
  },
  cancelButtonText: {
    color: "#374151",
    fontWeight: "500",
  },
  confirmButtonText: {
    color: "white",
    fontWeight: "500",
  },
});
