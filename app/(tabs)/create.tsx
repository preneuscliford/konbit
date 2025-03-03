import {
  Image,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { supabase } from "@/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../provider/AuthProvider";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

import { ActivityIndicator } from "react-native-paper";
import { EventForm } from "@/components/EventPicker";
import { uploadServicesImages } from "@/lib/homeService";
import { useImagePicker } from "@/hooks/useImagePicker";
import Toast, { ToastHandles } from "@/components/Toast";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import BackAppbar from "@/components/AppBar";
import { MaterialIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

// Pour simplifier, nous limitons ici les types à "service" et "event"
type ListingType = "service" | "event";

// Tableau de catégories de services (vous pourrez le récupérer depuis votre table "categories" ultérieurement)
const serviceCategories = [
  { id: 1, name: "Nettoyage" },
  { id: 2, name: "Réparation" },
  { id: 3, name: "Peinture" },
  { id: 4, name: "Déménagement" },
  { id: 5, name: "Jardinage" },
  { id: 6, name: "Plomberie" },
  { id: 7, name: "Électricité" },
  { id: 8, name: "Décoration" },
];

const Create = () => {
  const [uploading, setUploading] = useState(false);
  const { images, pickImages, removeImage, setImages } = useImagePicker();
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    type: "service" as ListingType,
    categoryId: "",
    location: "",
    startDate: new Date(),
    endDate: new Date(),
    // Vous pouvez ajouter "duration" ici si nécessaire (ex: "01:00:00" pour 1 heure)
  });

  const toastRef = useRef<ToastHandles>(null);

  const router = useRouter();
  const { session } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!session) {
      router.push("/(auth)/signUp");
      return; // Ajoutez un return pour éviter l'exécution du reste du code
    }
  }, [session]);

  const validateForm = () => {
    if (!session?.user?.id) {
      Alert.alert("Erreur", "Vous devez être connecté pour créer une annonce");
      return false;
    }
    if (!form.title.trim()) {
      Alert.alert("Erreur", "Le titre est obligatoire");
      return false;
    }
    if (!form.description.trim()) {
      Alert.alert("Erreur", "La description est obligatoire");
      return false;
    }
    if (images.length === 0) {
      Alert.alert("Erreur", "Au moins une image est requise");
      return false;
    }
    if (form.type === "service") {
      if (!form.price.trim() || isNaN(parseFloat(form.price))) {
        Alert.alert("Erreur", "Le prix doit être un nombre valide");
        return false;
      }
      if (!form.categoryId) {
        Alert.alert("Erreur", "Veuillez sélectionner une catégorie de service");
        return false;
      }
    }
    if (form.type === "event") {
      if (!form.location.trim()) {
        Alert.alert("Erreur", "Le lieu est obligatoire pour les événements");
        return false;
      }
      if (form.startDate >= form.endDate) {
        Alert.alert(
          "Erreur",
          "La date de fin doit être après la date de début"
        );
        return false;
      }
    }
    return true;
  };

  const submitForm = async () => {
    try {
      if (!validateForm()) return;
      setUploading(true);

      const mediaUrls = await uploadServicesImages(images);
      if (mediaUrls.length === 0) {
        throw new Error("Aucune image n'a pu être téléversée");
      }

      if (form.type === "event") {
        const { error: eventError } = await supabase.from("events").insert({
          title: form.title.trim(),
          description: form.description.trim(),
          start_date: form.startDate.toISOString(),
          end_date: form.endDate.toISOString(),
          file: mediaUrls,
          location: form.location,
          organizer_id: session?.user?.id,
        });

        if (eventError) throw eventError;
        await queryClient.invalidateQueries({ queryKey: ["events"] });
        toastRef.current?.show(
          "Votre événement a été ajouté avec succès",
          "success",
          1500
        );
        resetForm();
        router.back();
      } else if (form.type === "service") {
        const { error: serviceError } = await supabase.from("services").insert({
          title: form.title.trim(),
          description: form.description.trim(),
          price: parseFloat(form.price),
          gallery: mediaUrls,
          provider_id: session?.user?.id,
          category_id: form.categoryId,
        });

        if (serviceError) throw serviceError;
        await queryClient.invalidateQueries({ queryKey: ["services"] });
        toastRef.current?.show(
          "Votre service a été ajouté avec succès",
          "success",
          1500
        );
        resetForm();
        router.back();
      }
    } catch (error) {
      console.error("Erreur lors de la soumission:", error);
      if (error instanceof Error) {
        toastRef.current?.show(
          "Une erreur est survenue lors de la soumission de l'annonce",
          "error",
          1500
        );
      }
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      price: "",
      type: "service",
      categoryId: "",
      location: "",
      startDate: new Date(),
      endDate: new Date(),
    });
    setImages([]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackAppbar title="" />
      <StatusBar style="dark" backgroundColor="#F5F8FD" />
      <Toast ref={toastRef} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Créer une nouvelle annonce</Text>
            <Text style={styles.headerSubtitle}>
              Remplissez les informations de votre annonce
            </Text>
          </View>

          <View style={styles.contentContainer}>
            <TouchableOpacity onPress={pickImages} style={styles.imagePicker}>
              <MaterialIcons
                name="add-photo-alternate"
                size={24}
                color="#7D5FFF"
              />
              <Text style={styles.imagePickerText}>
                Ajouter des images ({images.length}/10)
              </Text>
            </TouchableOpacity>

            {images.length > 0 && (
              <ScrollView
                horizontal
                style={styles.imageScroll}
                contentContainerStyle={styles.imageScrollContent}
                showsHorizontalScrollIndicator={false}
              >
                {images.map((image, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image
                      source={{ uri: image.uri }}
                      style={styles.imagePreview}
                    />
                    <TouchableOpacity
                      onPress={() => removeImage(index)}
                      style={styles.removeImageButton}
                    >
                      <MaterialIcons name="close" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.formSection}>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.type}
                  onValueChange={(value: ListingType) =>
                    setForm({ ...form, type: value })
                  }
                  style={styles.picker}
                >
                  <Picker.Item label="Service" value="service" />
                  <Picker.Item label="Événement" value="event" />
                </Picker>
              </View>

              {form.type === "service" && (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={form.categoryId}
                    onValueChange={(value: string) =>
                      setForm({ ...form, categoryId: value })
                    }
                    style={styles.picker}
                  >
                    <Picker.Item label="Sélectionnez une catégorie" value="" />
                    {serviceCategories.map((cat) => (
                      <Picker.Item
                        key={cat.id}
                        label={cat.name}
                        value={cat.id}
                      />
                    ))}
                  </Picker>
                </View>
              )}

              {form.type === "event" && (
                <EventForm form={form} setForm={setForm} />
              )}

              <RNTextInput
                value={form.title}
                onChangeText={(text) => setForm({ ...form, title: text })}
                placeholder={
                  form.type === "event"
                    ? "Titre de l'événement"
                    : "Titre du service"
                }
                maxLength={100}
                style={styles.input}
              />

              <RNTextInput
                value={form.description}
                onChangeText={(text) => setForm({ ...form, description: text })}
                placeholder={
                  form.type === "event"
                    ? "Description de l'événement"
                    : "Description du service"
                }
                multiline
                numberOfLines={5}
                maxLength={1500}
                textAlignVertical="top"
                style={[styles.input, styles.textArea]}
              />

              {form.type === "service" ? (
                <RNTextInput
                  value={form.price}
                  onChangeText={(text) =>
                    setForm({ ...form, price: text.replace(/[^0-9.]/g, "") })
                  }
                  placeholder="Prix"
                  keyboardType="numeric"
                  style={styles.input}
                />
              ) : (
                <RNTextInput
                  value={form.location}
                  onChangeText={(text) => setForm({ ...form, location: text })}
                  placeholder="Lieu"
                  maxLength={100}
                  style={styles.input}
                />
              )}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  uploading && styles.submitButtonDisabled,
                ]}
                onPress={submitForm}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={24} color="#FFF" />
                    <Text style={styles.submitButtonText}>
                      {form.type === "event"
                        ? "Créer l'événement"
                        : "Créer le service"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F8FD",
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    padding: wp("5%"),
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: hp("2.8%"),
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: hp("1%"),
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: hp("1.8%"),
    color: "#64748B",
    letterSpacing: 0.3,
  },
  contentContainer: {
    padding: wp("5%"),
  },
  imagePicker: {
    backgroundColor: "#F3E8FF",
    padding: wp("4%"),
    borderRadius: wp("3%"),
    marginBottom: hp("2%"),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp("2%"),
  },
  imagePickerText: {
    fontSize: hp("1.8%"),
    color: "#7D5FFF",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  imageScroll: {
    marginBottom: hp("2%"),
  },
  imageScrollContent: {
    gap: wp("2%"),
  },
  imageWrapper: {
    position: "relative",
    borderRadius: wp("3%"),
    overflow: "hidden",
  },
  imagePreview: {
    width: wp("25%"),
    height: wp("25%"),
    borderRadius: wp("3%"),
  },
  removeImageButton: {
    position: "absolute",
    top: wp("2%"),
    right: wp("2%"),
    backgroundColor: "rgba(239, 68, 68, 0.9)",
    borderRadius: wp("2%"),
    padding: wp("1%"),
  },
  formSection: {
    gap: hp("2%"),
  },
  pickerContainer: {
    backgroundColor: "#FFF",
    borderRadius: wp("3%"),
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  picker: {
    height: hp("6%"),
  },
  input: {
    backgroundColor: "#FFF",
    borderRadius: wp("3%"),
    padding: wp("4%"),
    fontSize: hp("1.8%"),
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  textArea: {
    height: hp("20%"),
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#7D5FFF",
    padding: wp("4%"),
    borderRadius: wp("3%"),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: hp("3%"),
    gap: wp("2%"),
  },
  submitButtonDisabled: {
    backgroundColor: "#CBD5E1",
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: hp("1.8%"),
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});

export default Create;
