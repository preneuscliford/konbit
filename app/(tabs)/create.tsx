import { useState, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from "react-native";
import { Text, Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../provider/AuthProvider";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { useImagePicker } from "@/hooks/useImagePicker";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { uploadKonbitMedia } from "@/lib/konbitServices";
import { supabase } from "@/lib/supabase";
import { Image } from "expo-image";
import CategorySelector from "@/components/CategorySelector";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { KonbitCategory } from "@/types/konbitTypes";
import Colors from "@/constants/Colors";

const CreateKonbit = () => {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { images, pickImages, removeImage } = useImagePicker();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<KonbitCategory>("projet");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [participantsTarget, setParticipantsTarget] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [localsOnly, setLocalsOnly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const isValid = title.trim().length > 0 && description.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const media = await uploadKonbitMedia(images);
      const { data, error } = await supabase
        .from("konbits")
        .insert({
          title: title.trim(),
          description: description.trim(),
          category,
          location: location.trim() || null,
          event_date: eventDate ? eventDate.toISOString() : null,
          participants_target: participantsTarget
            ? parseInt(participantsTarget, 10)
            : null,
          required_skills: requiredSkills.trim() || null,
          locals_only: localsOnly,
          media,
          user_id: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["konbits"] });
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Konbit creation error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeBtn}
          >
            <MaterialIcons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Créer une Konbit</Text>
          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={isSubmitting || !isValid}
            loading={isSubmitting}
            style={styles.publishBtn}
            labelStyle={styles.publishLabel}
          >
            Publier
          </Button>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled">
          <CategorySelector selected={category} onSelect={setCategory} />

          <TextInput
            ref={inputRef}
            placeholder="Titre de votre Konbit"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
            style={styles.titleInput}
            autoFocus
          />

          <TextInput
            placeholder="Décrivez votre initiative, ce dont vous avez besoin..."
            placeholderTextColor="#9CA3AF"
            multiline
            value={description}
            onChangeText={setDescription}
            style={styles.descriptionInput}
          />

          <View style={styles.optionalFields}>
            <View style={styles.fieldRow}>
              <Feather name="map-pin" size={18} color={Colors.textMuted} />
              <TextInput
                placeholder="Localisation (optionnel)"
                placeholderTextColor="#9CA3AF"
                value={location}
                onChangeText={setLocation}
                style={styles.fieldInput}
              />
            </View>

            <TouchableOpacity
              style={styles.fieldRow}
              onPress={() => setDatePickerVisible(true)}
            >
              <Feather name="calendar" size={18} color={Colors.textMuted} />
              <Text
                style={[
                  styles.fieldInput,
                  !eventDate && { color: "#9CA3AF" },
                ]}
              >
                {eventDate
                  ? eventDate.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Date (optionnel)"}
              </Text>
              {eventDate && (
                <TouchableOpacity onPress={() => setEventDate(null)}>
                  <MaterialIcons name="close" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <View style={styles.fieldRow}>
              <Feather name="users" size={18} color={Colors.textMuted} />
              <TextInput
                placeholder="Participants recherchés (optionnel)"
                placeholderTextColor="#9CA3AF"
                value={participantsTarget}
                onChangeText={(v) => setParticipantsTarget(v.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                style={styles.fieldInput}
              />
            </View>

            <View style={styles.fieldRow}>
              <Feather name="award" size={18} color={Colors.textMuted} />
              <TextInput
                placeholder="Compétences recherchées (optionnel)"
                placeholderTextColor="#9CA3AF"
                value={requiredSkills}
                onChangeText={setRequiredSkills}
                style={styles.fieldInput}
              />
            </View>

            <View style={[styles.fieldRow, styles.switchRow]}>
              <Feather name="map-pin" size={18} color={Colors.textMuted} />
              <Text style={styles.switchLabel}>
                Participation locale uniquement
              </Text>
              <Switch
                value={localsOnly}
                onValueChange={setLocalsOnly}
                trackColor={{ false: "#E5E7EB", true: Colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {images.length > 0 && (
            <View style={styles.imageRow}>
              {images.map((img, i) => (
                <View key={i} style={styles.imgWrap}>
                  {img.type === "video" ? (
                    <View style={[styles.thumb, styles.videoThumb]}>
                      <Feather name="video" size={24} color="#FFFFFF" />
                    </View>
                  ) : (
                    <Image source={{ uri: img.uri }} style={styles.thumb} />
                  )}
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeImage(i)}
                  >
                    <MaterialIcons name="close" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity onPress={pickImages} style={styles.mediaBtn}>
            <MaterialIcons name="image" size={24} color="#00209F" />
          </TouchableOpacity>
        </View>

        <DateTimePickerModal
          isVisible={datePickerVisible}
          mode="date"
          date={eventDate || new Date()}
          onConfirm={(date) => {
            setEventDate(date);
            setDatePickerVisible(false);
          }}
          onCancel={() => setDatePickerVisible(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF5" },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0EB",
  },
  closeBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A2E" },
  publishBtn: { borderRadius: 20, backgroundColor: "#00209F" },
  publishLabel: { fontSize: 14, fontWeight: "600" },
  titleInput: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A2E",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  descriptionInput: {
    fontSize: 15,
    lineHeight: 22,
    color: "#1A1A2E",
    paddingHorizontal: 16,
    paddingBottom: 8,
    minHeight: 100,
    textAlignVertical: "top",
  },
  optionalFields: {
    paddingHorizontal: 16,
    gap: 4,
    marginTop: 8,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0EB",
  },
  fieldInput: {
    flex: 1,
    fontSize: 14,
    color: "#1A1A2E",
  },
  switchRow: {
    justifyContent: "space-between",
  },
  switchLabel: {
    flex: 1,
    fontSize: 14,
    color: "#1A1A2E",
  },
  imageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 12,
  },
  imgWrap: { position: "relative", borderRadius: 10, overflow: "hidden" },
  thumb: { width: 80, height: 80, borderRadius: 10 },
  videoThumb: {
    backgroundColor: "#1A1A2E",
    justifyContent: "center",
    alignItems: "center",
  },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    padding: 2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0EB",
  },
  mediaBtn: { padding: 4 },
});

export default CreateKonbit;
