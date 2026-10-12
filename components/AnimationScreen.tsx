import React from "react";
import { StyleSheet, View } from "react-native";
import LottieView from "lottie-react-native";
import { StatusBar } from "expo-status-bar";

// Intro Konbit 509 (2,5 s) : prend le relais du splash natif, même fond blanc.
const AnimationScreen = ({
  onAnimationFinish = () => {},
}: {
  onAnimationFinish?: (isCancelled: boolean) => void;
}) => {
  return (
    <View style={styles.animationContainer}>
      <StatusBar style="dark" />
      <LottieView
        onAnimationFinish={onAnimationFinish}
        loop={false}
        autoPlay
        style={styles.animation}
        source={require("../assets/lottie/konbit509-intro.json")}
      />
    </View>
  );
};

export default AnimationScreen;

const styles = StyleSheet.create({
  animationContainer: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  animation: {
    width: 220,
    height: 220,
  },
});
