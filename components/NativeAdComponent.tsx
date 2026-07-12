import { AntDesign, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageStyle,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeMediaView,
  NativeAssetType,
  TestIds,
} from "react-native-google-mobile-ads";
import { ActivityIndicator } from "react-native";

const NativeAdComponent: React.FC = () => {
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);

  useEffect(() => {
    let isMounted = true;
    // Charger l'annonce native avec l'ID de test ou ton identifiant production
    NativeAd.createForAdRequest(TestIds.NATIVE)
      .then((ad: NativeAd) => {
        if (isMounted) {
          setNativeAd(ad);
        }
      })
      .catch((error: Error) => {
        console.error("Erreur lors du chargement de l'annonce native :", error);
      });

    // Nettoyage lors du démontage
    return () => {
      isMounted = false;
      if (nativeAd) {
        nativeAd.destroy();
      }
    };
  }, []);

  if (!nativeAd) {
    return <ActivityIndicator size="small" color="#9333EA" />;
  }

  const { width } = Dimensions.get("window");

  return (
    <NativeAdView nativeAd={nativeAd}>
      <View style={styles.adContainer}>
        <View className="flex-row items-center gap-3">
          {/* Afficher l'icône de l'annonce */}
          {nativeAd.icon && (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
            </NativeAsset>
          )}

          {/* Afficher le titre (headline) */}
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={styles.headline} numberOfLines={1}>
              {nativeAd.headline || "Titre de l'annonce"}
            </Text>
          </NativeAsset>
        </View>

        {/* Afficher le média (image ou vidéo) */}
        <NativeMediaView style={styles.media} />

        {/* Bouton Call-to-Action */}
        {nativeAd.callToAction && (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <Text style={styles.cta}>{nativeAd.callToAction}</Text>
          </NativeAsset>
        )}

        {/* Mention d'attribution */}
        <Text style={styles.adAttribution}>Sponsorisé</Text>
        <View
          className="flex-row justify-between items-center px-2"
          style={{
            paddingVertical: 5,
            borderStyle: "solid",
            borderBottomWidth: 0,
            borderTopWidth: 1,
            borderColor: "rgba(0, 0, 0, 0.1)",
            shadowColor: "#000",
            shadowOffset: { width: 1, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 5,
          }}
        >
          <View className="flex-row items-center gap-4">
            <TouchableOpacity className="flex-row items-center gap-2 mt-2">
              <AntDesign
                style={{ opacity: 0.5 }}
                name="heart"
                size={22}
                color="black"
              />
              <Text className="text-gray-600 font-medium"></Text>
            </TouchableOpacity>

            <View className="flex-row items-center gap-2">
              <Feather
                style={{ opacity: 0.5 }}
                name="message-circle"
                size={22}
                color="black"
              />
              <Text className="text-gray-600 font-medium"></Text>
            </View>
          </View>

          <View className="flex-row items-center gap-4">
            <TouchableOpacity>
              <MaterialCommunityIcons
                style={{ opacity: 0.5 }}
                name="share-outline"
                size={24}
                color="black"
              />
            </TouchableOpacity>

            <TouchableOpacity>
              <Feather
                style={{ opacity: 0.5 }}
                name="bookmark"
                size={22}
                color="black"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </NativeAdView>
  );
};

interface Styles {
  adContainer: ViewStyle;
  loadingText: TextStyle;
  icon: ImageStyle;
  headline: TextStyle;
  media: ViewStyle;
  cta: TextStyle;
  adAttribution: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  adContainer: {
    padding: 16,
    marginBottom: 2,
    backgroundColor: "#F5F8FD",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  loadingText: {
    textAlign: "center",
    margin: 20,
    fontSize: hp("1%"),
    color: "#666",
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 25,
    marginRight: 4,
  },
  headline: {
    fontSize: hp("2%"),
    letterSpacing: 0.5,
    fontWeight: "bold",
    color: "#333",
  },
  media: {
    width: "100%",
    height: 200,
    marginVertical: 8,
    backgroundColor: "#eaeaea",
  },
  cta: {
    backgroundColor: "#7D5FFF",
    color: "#FFF",
    paddingVertical: 8,
    fontSize: hp("1.5%"),
    paddingHorizontal: 12,
    borderRadius: 8,
    textAlign: "center",
    fontWeight: "600",
  },
  adAttribution: {
    fontSize: hp("1.2%"),
    color: "#888",
    marginTop: 8,
    marginBottom: 2,
  },
});

export default NativeAdComponent;
