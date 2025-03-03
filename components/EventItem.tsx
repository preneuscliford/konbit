import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { LinearGradient } from "expo-linear-gradient";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { CircleUserRound, Trash2 } from "lucide-react-native";
import { AlertDialog } from "@/components/AlertDialog";
import { useAuth } from "@/app/provider/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

import { ServiceImages } from "./Images";
import RemoteImage from "./RemoteImage";

dayjs.locale("fr"); // Configuration globale

const EventItem = ({ event, onPress }: any) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Formatage de la date de début et fin
  const formattedDate = `${dayjs(event.start_date).format(
    "dddd DD MMM  HH:mm"
  )} → ${dayjs(event.end_date).format("HH:mm")}`;

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", event.id);

      if (error) throw error;

      // Invalider la query pour rafraîchir la liste
      queryClient.invalidateQueries({ queryKey: ["events"] });
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* Image & Catégorie */}
      <View style={styles.imageContainer}>
        <ServiceImages
          path={event.file?.[0]}
          style={{ width: "100%", height: "100%", resizeMode: "cover" }}
          fallback="event-image"
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)"]}
          style={styles.gradient}
        >
          <View style={styles.authorInfo}>
            {event.profiles?.avatar_url ? (
              event.profiles.avatar_url.startsWith("https://") ? (
                <Image
                  source={{ uri: event.profiles.avatar_url }}
                  style={styles.authorImage}
                />
              ) : (
                <RemoteImage
                  path={event.profiles.avatar_url}
                  fallback="profile-placeholder"
                  style={styles.authorImage}
                />
              )
            ) : (
              <CircleUserRound color="white" size={wp("8%")} />
            )}
            <View>
              <Text style={styles.authorName}>
                {event.profiles?.full_name ||
                  event.profiles?.username ||
                  "Utilisateur"}
              </Text>
              <View style={styles.categoryTag}>
                <Text style={styles.categoryText}>
                  {event.category || "Événement"}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
        {user?.id === event.organizer_id && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setShowDeleteDialog(true)}
          >
            <Trash2 color="white" size={20} />
          </TouchableOpacity>
        )}
      </View>

      {/* Contenu */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.subTitle} numberOfLines={1}>
          {event.description || "Aucune description"}
        </Text>

        {/* Localisation & Date */}
        <View style={styles.metaContainer}>
          <View style={styles.infoGroup}>
            <MaterialIcons name="location-on" size={16} color="#666" />
            <Text style={styles.location} numberOfLines={1}>
              {event.location || "Lieu inconnu"}
            </Text>
          </View>

          <View style={styles.infoGroup}>
            <MaterialIcons name="calendar-today" size={16} color="#666" />
            <Text style={styles.date} numberOfLines={1}>
              {formattedDate}
            </Text>
          </View>
        </View>

        {/* Prix */}
        {/* <View style={styles.priceContainer}>
          <Text style={styles.price}>
            {event.price ? `€${event.price}` : "Gratuit"}
          </Text>
          {event.price && <Text style={styles.priceLabel}>/personne</Text>}
        </View> */}
      </View>

      <AlertDialog
        isVisible={showDeleteDialog}
        title="Supprimer l'événement"
        message="Êtes-vous sûr de vouloir supprimer cet événement ?"
        confirmText="Supprimer"
        cancelText="Annuler"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: wp("52%"),
    marginHorizontal: 8,
  },
  imageContainer: {
    height: hp("20%"),
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "40%",
    padding: 16,
    justifyContent: "flex-end",
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
    marginTop: "auto",
  },
  authorImage: {
    width: wp("8%"),
    height: wp("8%"),
    borderRadius: wp("4%"),
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  authorName: {
    color: "#FFFFFF",
    fontSize: hp("1.4%"),
    fontWeight: "600",
    marginBottom: hp("0.5%"),
  },
  categoryTag: {
    backgroundColor: "#9333EA",
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  categoryText: {
    color: "#fff",
    fontSize: hp("1%"),
    fontWeight: "600",
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: hp("1.8%"),
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  subTitle: {
    fontSize: hp("1.5%"),
    letterSpacing: 0.5,
    color: "#64748B",
    marginBottom: 2,
  },
  metaContainer: {
    gap: 8,
  },
  infoGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  location: {
    color: "#64748B",
    fontSize: hp("1.3%"),
    letterSpacing: 0.5,
  },
  date: {
    color: "#64748B",
    fontSize: hp("1.3"),
    letterSpacing: 0.5,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  price: {
    color: "#9333EA",
    fontSize: 18,
    fontWeight: "700",
  },
  priceLabel: {
    color: "#64748B",
    fontSize: 12,
  },
  deleteButton: {
    position: "absolute",
    top: wp("2%"),
    right: wp("2%"),
    backgroundColor: "rgba(239, 68, 68, 0.8)",
    padding: wp("2%"),
    borderRadius: wp("2%"),
    zIndex: 10,
  },
});

export default EventItem;
