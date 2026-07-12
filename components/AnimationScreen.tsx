import React from "react";
import { useRef, useEffect } from "react";
import { Button, StyleSheet, useWindowDimensions, View } from "react-native";
import LottieView from "lottie-react-native";
import { StatusBar } from "expo-status-bar";

const AnimationScreen = ({
  onAnimationFinish = (isCancelled) => {},
}: {
  onAnimationFinish?: (isCancelled: boolean) => void;
}) => {
  const dimensions = useWindowDimensions();
  const animation = useRef<LottieView>(null);
  useEffect(() => {
    // You can control the ref programmatically, rather than using autoPlay
    // animation.current?.play();
  }, []);
  return (
    <View style={styles.animationContainer}>
      <StatusBar style="light" />
      <LottieView
        onAnimationFinish={onAnimationFinish}
        loop={false}
        autoPlay
        ref={animation}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#181F27",
        }}
        // Find more Lottie files at https://lottiefiles.com/featured
        source={require("../assets/lottie/splash-anime.json")}
      />
    </View>
  );
};

export default AnimationScreen;

const styles = StyleSheet.create({
  animationContainer: {
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
});
