import React, { useEffect, useState } from "react";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";

import { supabase } from "../lib/supabase";

import { useRouter } from "expo-router";

import { ServiceImages } from "./Images";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import RemoteImage from "@/components/RemoteImage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleUserRound, Trash2 } from "lucide-react-native";
import { AlertDialog } from "@/components/AlertDialog";
import { useAuth } from "@/app/provider/AuthProvider";

interface Service {
  id: string;
  titre: string;
  prestataire: string;
  type: string;
  image: string;
  prix: number;
  avis: number;
  location: string;
  profiles: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string;
  };
  reviews: {
    rating: number;
  }[];
}

const DerniersServices = () => {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const { data: services, isLoading: chargement } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select(`*, profiles(*), reviews(*), category_id(*)`)
        .order("created_at", { ascending: false })
        .limit(2);

      if (error) throw error;

      return data.map((service: any) => ({
        id: service.id,
        titre: service?.title,
        prestataire: service?.profiles?.full_name || service.profiles.username,
        type: service?.category_id?.name || "Général",
        image: service?.gallery[0],
        prix: service.price,
        avis: service.reviews[0]?.count || 0,
        location: service.location,
        profiles: service.profiles,
        reviews: service.reviews,
      }));
    },
  });

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", itemToDelete);

      if (error) throw error;

      // Invalider la query pour rafraîchir la liste
      queryClient.invalidateQueries({ queryKey: ["services"] });
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    } finally {
      setItemToDelete(null);
    }
  };

  if (chargement) {
    return <ActivityIndicator style={{ marginVertical: 20 }} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.entete}>
        <Text style={styles.titre}>Derniers services</Text>
        <TouchableOpacity onPress={() => router.push("/services/all")}>
          <Text style={styles.toutVoir}>Tout voir</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={services}
        scrollEnabled={false}
        numColumns={2}
        columnWrapperStyle={styles.rangee}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.carte}
            onPress={() => {
              router.push({
                pathname: "/services/details/[id]",
                params: { id: item.id },
              });
            }}
          >
            <View style={styles.imageContainer}>
              <ServiceImages
                path={item.image}
                fallback="services Image"
                style={styles.image}
              />
              <View style={styles.authorOverlay}>
                <View style={styles.authorInfo}>
                  {item.profiles?.avatar_url ? (
                    item.profiles.avatar_url.startsWith("https://") ? (
                      <Image
                        source={{ uri: item.profiles.avatar_url }}
                        style={styles.authorImage}
                      />
                    ) : (
                      <RemoteImage
                        path={item.profiles.avatar_url}
                        fallback="profile-placeholder"
                        style={styles.authorImage}
                      />
                    )
                  ) : (
                    <CircleUserRound color="white" size={wp("8%")} />
                  )}
                  <View>
                    <Text style={styles.authorName}>
                      {item.profiles?.full_name ||
                        item.profiles?.username ||
                        "Utilisateur"}
                    </Text>
                    <View style={styles.ratingContainer}>
                      <MaterialCommunityIcons
                        name="star"
                        size={12}
                        color="#FFC107"
                      />
                      <Text style={styles.rating}>
                        {item.reviews?.length > 0
                          ? (
                              item.reviews.reduce(
                                (acc: number, curr: any) => acc + curr.rating,
                                0,
                              ) / item.reviews.length
                            ).toFixed(1)
                          : "Nouveau"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              {user?.id === item.profiles.id && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => setItemToDelete(item.id)}
                >
                  <Trash2 color="white" size={20} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.contenu}>
              <Text numberOfLines={2} style={styles.titreItem}>
                {item.titre}
              </Text>

              {item.location && (
                <View style={styles.locationContainer}>
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={14}
                    color="#666"
                  />
                  <Text numberOfLines={1} style={styles.location}>
                    {item.location}
                  </Text>
                </View>
              )}

              <View style={styles.infoContainer}>
                <Text style={styles.prix}>€{item.prix}</Text>
              </View>

              <View style={styles.typeContainer}>
                <Text style={styles.type}>{item.type}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
      />
      <AlertDialog
        isVisible={!!itemToDelete}
        title="Supprimer le service"
        message="Êtes-vous sûr de vouloir supprimer ce service ?"
        confirmText="Supprimer"
        cancelText="Annuler"
        onConfirm={handleDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  entete: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  titre: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  toutVoir: {
    color: "#0D9488",
    fontSize: 13,
    fontWeight: "600",
  },
  rangee: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
    gap: 10,
  },
  carte: {
    width: wp("45%"),
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 10,
  },
  imageContainer: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  contenu: {
    padding: 12,
  },
  titreItem: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 4,
    lineHeight: 18,
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  prix: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0D9488",
    marginBottom: 6,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 3,
  },
  location: {
    fontSize: 11,
    color: "#9CA3AF",
    flex: 1,
  },
  typeContainer: {
    backgroundColor: "#F0FDFA",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  type: {
    color: "#0D9488",
    fontSize: 10,
    fontWeight: "600",
  },
  authorOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  authorImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  authorName: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  rating: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "500",
  },
  deleteButton: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(239, 68, 68, 0.85)",
    padding: 5,
    borderRadius: 6,
    zIndex: 10,
  },
});

export default DerniersServices;
