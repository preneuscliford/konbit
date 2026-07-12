import { Image, StyleSheet, View, FlatList } from "react-native";
import React from "react";
import { Text, useTheme } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

const images = [
  {
    id: 1,
    url: require("../assets/images/do.png"),
    title: "Découvertes Uniques",
    subtitle: "Explorez nos dernières trouvailles",
  },
  {
    id: 2,
    url: require("../assets/images/tech.png"),
    title: "Tech & Innovation",
    subtitle: "Les dernières nouveautés technologiques",
  },
  {
    id: 3,
    url: require("../assets/images/build.png"),
    title: "Maison & Déco",
    subtitle: "Créez votre intérieur idéal",
  },
];

const Slider = () => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <FlatList
        data={images}
        horizontal
        showsVerticalScrollIndicator={false}
        pagingEnabled
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Image source={item.url} style={styles.image} resizeMode="cover" />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.8)"]}
              style={styles.gradient}
            >
              <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </View>
            </LinearGradient>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 180,
    marginVertical: 12,
  },
  slide: {
    width: wp("82%"),
    height: 180,
    marginLeft: 16,
    marginRight: 8,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
    justifyContent: "flex-end",
  },
  textContainer: {
    padding: 16,
  },
  title: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
  },
});

export default Slider;
