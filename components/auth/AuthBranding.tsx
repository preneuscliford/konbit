import React from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { useColorScheme } from "@/hooks/useColorScheme";

interface AuthBrandingProps {
  title: string;
  subtitle: string;
}

const AuthBranding = ({ title, subtitle }: AuthBrandingProps) => {
  const scheme = useColorScheme();
  const logo =
    scheme === "dark"
      ? require("@/assets/icons/splash-icon-light.png")
      : require("@/assets/icons/splash-icon-dark.png");

  return (
    <View className="items-center mb-8">
      <Image source={logo} style={{ width: 72, height: 72 }} contentFit="contain" />
      <Text className="text-2xl font-bold text-charcoal mt-4">{title}</Text>
      <Text className="text-sm text-charcoal-muted mt-1 text-center">{subtitle}</Text>
    </View>
  );
};

export default AuthBranding;
