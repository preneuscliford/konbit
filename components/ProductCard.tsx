import { View, Text, StyleSheet } from "react-native";
import ProductsImage from "./ProductsImage";

const ProductCard = ({ image, title, price, category, badges }: any) => (
  <View style={styles.card}>
    <View style={styles.imageContainer}>
      <ProductsImage
        path={image}
        fallback="product image"
        style={styles.image}
      />
      {badges?.length > 0 && (
        <View style={styles.badges}>
          {badges.map((badge: any, index: number) => (
            <View key={index} style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
    <View style={styles.info}>
      <Text style={styles.category}>{category}</Text>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.price}>€{price}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 140,
  },
  badges: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    gap: 4,
  },
  badge: {
    backgroundColor: "#0D9488",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  info: {
    padding: 12,
  },
  category: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 4,
    textTransform: "uppercase",
    fontWeight: "500",
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 6,
    lineHeight: 18,
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0D9488",
  },
});

export default ProductCard;
