import { useRouter } from "expo-router";
import * as React from "react";
import { Appbar } from "react-native-paper";
import Colors from "@/constants/Colors";

const BackAppbar = ({ title }: { title: string }) => {
  const router = useRouter();

  return (
    <Appbar.Header
      style={{ backgroundColor: Colors.surfaceWarm }}
      elevated={false}
    >
      <Appbar.BackAction color={Colors.text} onPress={() => router.back()} />
      <Appbar.Content
        style={{ alignItems: "center" }}
        title={title}
        titleStyle={{ fontSize: 17, fontWeight: "800", color: Colors.text }}
      />
    </Appbar.Header>
  );
};

export default BackAppbar;
