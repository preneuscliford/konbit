import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import React, { useEffect, useState } from "react";

import { AntDesign, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { getContrastType, getDominantColor } from "@/hooks/useImageColors";
import { useQuery } from "@tanstack/react-query";
import { fetchServices } from "@/lib/homeService";
import { ServiceImages } from "@/components/Images";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { CircleArrowLeft, MoveLeft } from "lucide-react-native";
import UserInfoCard from "@/components/UserInfoCard";
import { useAuth } from "../provider/AuthProvider";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

interface data {
  id: string;
  gallery: string[];
  // ... d'autres propriétés si besoin
}

interface dataDetailsProps {
  data: data;
}

const dataDetails: React.FC<dataDetailsProps> = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [dominantColors, setDominantColors] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const { userData } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["services", id],
    queryFn: () => fetchServices(id),
  });

  useEffect(() => {
    if (!isLoading && data?.gallery) {
      const extractColors = async () => {
        const colorPromises = data.gallery.map(async (img: string) => {
          try {
            return await getDominantColor(img);
          } catch (error) {
            console.error("Error extracting color:", error);
            return "#F5F8FD"; // Couleur de fallback
          }
        });

        const colors = await Promise.all(colorPromises);
      };

      extractColors();
    }
  }, [data, isLoading]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / width);
    setCurrentImageIndex(newIndex);
  };

  if (isLoading) {
    return (
      <ActivityIndicator style={{ flex: 1, backgroundColor: "#F5F8FD" }} />
    );
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <Text>data non trouvé</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        style={getContrastType(dominantColors[currentImageIndex] || "#F5F8FD")}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Galerie d'images */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {data?.gallery?.map((image: string, index: number) => (
            <View key={index} style={{ width }}>
              <LinearGradient
                colors={[
                  "transparent",
                  dominantColors[index] + "rgba(0,0,0,0.8)",
                ]}
                style={styles.imageOverlay}
              />
              <ServiceImages
                path={image}
                fallback="service image"
                style={{ width, height: hp("30%"), objectFit: "cover" }}
              />
            </View>
          ))}
        </ScrollView>

        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.title}>{data?.title}</Text>

          <UserInfoCard
            user={data?.profiles}
            isOwner={userData?.id === data?.profiles?.id}
          />
          {/* <UserInfoCard user={data?.profiles} /> */}
          {/* <View>
              <Text style={styles.providerName}>
                {data?.profiles?.full_name}
              </Text>
              <Text style={styles.category}>{data?.categories?.name}</Text>
            </View> */}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>À propos</Text>
          <Text style={styles.description}>
            {data?.description || "Aucune description fournie"}
          </Text>
        </View>

        {/* Avis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Avis ({data?.reviews?.length})
          </Text>
          {/* Composant d'avis à implémenter */}
        </View>
      </ScrollView>

      {/* Actions fixes en bas */}
      <View style={styles.actionBar}>
        {/* <TouchableOpacity style={styles.messageButton}>
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookButton}>
          <Text style={styles.bookButtonText}>Réserver maintenant</Text>
        </TouchableOpacity> */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8FD",
    paddingTop: Platform.OS === "android" ? 0 : 0,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
    zIndex: 2,
  },

  header: {
    padding: 16,
  },
  title: {
    fontSize: hp("2%"),
    letterSpacing: 1,
    fontWeight: "bold",
    marginBottom: 10,
  },
  providerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  providerName: {
    fontSize: hp("1.8%"),
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  category: {
    color: "#666",
    fontSize: hp("1.5%"),
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 0,
  },
  locationText: {
    marginLeft: 4,
    color: "#666",
  },
  section: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  sectionTitle: {
    fontSize: hp("1.8%"),
    letterSpacing: 0.5,
    fontWeight: "600",
    marginBottom: 12,
  },
  description: {
    fontSize: hp("1.5%"),
    letterSpacing: 0.5,

    color: "#444",
  },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  messageButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",

    borderRadius: 8,

    alignItems: "center",
  },
  bookButton: {
    flex: 1,
    backgroundColor: "#9333ea",

    borderRadius: 8,
    marginLeft: 8,
    alignItems: "center",
  },
  messageButtonText: {
    color: "#333",
    fontWeight: "600",
  },
  bookButtonText: {
    color: "white",
    fontWeight: "600",
  },
});

export default dataDetails;
