import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ServiceImages } from "./Images";

interface ServiceCardProps {
  service: {
    id: string;
    title: string;
    gallery: string[];
    price: number;
    location: string;
    profiles: {
      full_name: string;
      username: string;
    };
    category_id: {
      name: string;
    };
    reviews: {
      rating: number;
    }[];
  };
  onPress: () => void;
}

const ServiceCard = ({ service, onPress }: ServiceCardProps) => {
  const averageRating = service.reviews?.length
    ? service.reviews.reduce((acc, curr) => acc + curr.rating, 0) /
      service.reviews.length
    : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.imageContainer}>
        <ServiceImages
          path={service.gallery?.[0]}
          style={styles.image}
          fallback="service-image"
        />
        <View style={styles.categoryTag}>
          <Text style={styles.categoryText}>
            {service.category_id?.name || "Service"}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {service.title}
        </Text>
        <Text style={styles.provider} numberOfLines={1}>
          par {service.profiles?.full_name || service.profiles?.username}
        </Text>
        <View style={styles.locationRow}>
          <MaterialCommunityIcons name="map-marker" size={14} color="#9CA3AF" />
          <Text style={styles.location} numberOfLines={1}>
            {service.location}
          </Text>
        </View>
        <View style={styles.footer}>
          <View style={styles.ratingRow}>
            <MaterialCommunityIcons name="star" size={16} color="#F59E0B" />
            <Text style={styles.rating}>{averageRating.toFixed(1)}</Text>
          </View>
          <Text style={styles.price}>{service.price} €</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  imageContainer: {
    height: 160,
    width: "100%",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  categoryTag: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#0D9488",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  content: {
    padding: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  provider: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 4,
  },
  location: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0EB",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rating: {
    fontSize: 14,
    color: "#1A1A2E",
    fontWeight: "600",
  },
  price: {
    fontSize: 18,
    color: "#0D9488",
    fontWeight: "700",
  },
});

export default ServiceCard;
