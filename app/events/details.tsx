import React from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import RemoteImage from "@/components/RemoteImage";
import { Button } from "react-native-paper";
import { ServiceImages } from "@/components/Images";
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { LinearGradient } from "expo-linear-gradient";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { fetchEventsById } from "@/lib/homeService";
import { useQuery } from "@tanstack/react-query";

const EventDetails = () => {
  const { id }: any = useLocalSearchParams<{ id: string }>();

  const { data: event, isLoading } = useQuery({
    queryKey: ["events", id],
    queryFn: () => fetchEventsById(id),
  });

  console.log();

  const formattedDate = `${dayjs(event?.start_date).format(
    "dddd DD MMM  HH:mm",
  )} → ${dayjs(event?.end_date).format("HH:mm")}`;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {event?.map((item: any) => (
        <View className="flex-1" key={item.id}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)"]}>
              <ServiceImages
                path={item?.file?.[0]}
                style={styles.mainImage}
                fallback="event-image"
              />
            </LinearGradient>
            <View style={styles.content}>
              <Text style={styles.title}>{item?.title}</Text>

              <View className="flex-row items-center">
                {item?.organizer_id?.avatar_url &&
                  item.organizer_id.avatar_url.startsWith("https://") && (
                    <Image
                      source={{ uri: item.organizer_id?.avatar_url }}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 20,
                        marginRight: 8,
                      }}
                    />
                  )}
                {(item?.organizer_id.avatar_url &&
                  !item.organizer_id.avatar_url.startsWith("https://") && (
                    <RemoteImage
                      path={item.organizer_id.avatar_url}
                      fallback="account-circle"
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 32,
                        marginRight: 8,
                      }}
                    />
                  )) ||
                  (!item.organizer_id.avatar_url && (
                    <MaterialIcons
                      name="account-circle"
                      size={34}
                      color="#9333EA"
                      style={{ marginRight: 8 }}
                    />
                  ))}

                <View>
                  <Text className="font-bold text-slate-800">
                    {item?.organizer_id.full_name ||
                      item?.organizer_id.organizer_idname}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsContainer}>
                <View style={styles.detailItem}>
                  <MaterialIcons
                    name="calendar-today"
                    size={24}
                    color="#9333EA"
                  />
                  <Text style={styles.detailText}>{formattedDate}</Text>
                </View>

                <View style={styles.detailItem}>
                  <MaterialIcons name="location-on" size={24} color="#9333EA" />
                  <Text style={styles.detailText}>{item?.location}</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{item?.description}</Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button onPress={() => console.log("Book")}>
              <Text style={{ fontSize: hp("1.8%"), letterSpacing: 0.5 }}>
                Participer
              </Text>
            </Button>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  mainImage: {
    width: "100%",
    aspectRatio: 4 / 3,
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: hp("30%"),
    justifyContent: "flex-end",
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: hp("2%"),
    letterSpacing: 1,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 14,
  },
  detailsContainer: {
    gap: 12,
    marginBottom: 10,
    marginLeft: 5,
    marginVertical: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailText: {
    fontSize: hp("1.5%"),
    letterSpacing: 0.5,
    color: "#374151",
  },
  sectionTitle: {
    fontSize: hp("1.8%"),
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  description: {
    fontSize: hp("1.5%"),
    lineHeight: hp("1.8%"),
    color: "#4B5563",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
});

export default EventDetails;
