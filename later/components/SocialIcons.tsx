import { View, TouchableOpacity, Image } from "react-native";
import React from "react";

export const SocialIcons = () => {
  return (
    <View className="flex flex-row items-center justify-center py-4">
      <TouchableOpacity className="bg-zinc-200 rounded-lg px-48 py-10">
        <Image
          source={require("../assets/images/google.png")}
          style={{ width: 30, height: 30 }}
        />
      </TouchableOpacity>
      <TouchableOpacity className="bg-zinc-200 mx-2 rounded-lg px-16 py-2 ml">
        <Image
          source={require("../assets/images/facebook.png")}
          style={{ width: 30, height: 30 }}
        />
      </TouchableOpacity>
    </View>
  );
};
