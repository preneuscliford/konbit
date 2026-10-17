import React from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";

interface AuthBrandingProps {
  title: string;
  subtitle: string;
}

const AuthBranding = ({ title, subtitle }: AuthBrandingProps) => {
  return (
    <View className="items-center mb-8">
      <Image
        source={require("@/assets/brand/logo.png")}
        style={{ width: 80, height: 74 }}
        contentFit="contain"
      />
      <Text className="text-2xl font-bold text-charcoal mt-4">{title}</Text>
      <Text className="text-sm text-charcoal-muted mt-1 text-center">{subtitle}</Text>
    </View>
  );
};

export default AuthBranding;
