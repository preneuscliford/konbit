import React from "react";
import { Text, StyleSheet } from "react-native";

interface Props {
  text: string;
  style?: any;
}

// Regex to match hashtags (French + English supported)
const HASHTAG_REGEX = /#[\wÀ-ÿ]+/g;

const HashtagText = ({ text, style }: Props) => {
  if (!text) return null;

  const parts = text.split(HASHTAG_REGEX);
  const matches = text.match(HASHTAG_REGEX) || [];

  return (
    <Text style={style}>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          <Text>{part}</Text>
          {matches[i] && <Text style={styles.hashtag}>{matches[i]}</Text>}
        </React.Fragment>
      ))}
    </Text>
  );
};

const styles = StyleSheet.create({
  hashtag: {
    color: "#0D9488",
    fontWeight: "600",
  },
});

export default HashtagText;
