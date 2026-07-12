import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Card, Text, Chip, Badge } from "react-native-paper";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import ProductsImage from "@/components/ProductsImage";
import { SafeAreaView } from "react-native-safe-area-context";

interface Product {
  category: string;
  price: number;
  title: string;
  desc: string;
  imageUrl: string;
}
const search = () => {
  const [resultats, setResultats] = useState<Product[]>([]);
  const { query } = useLocalSearchParams();

  useEffect(() => {
    recherche();
  }, []);

  const recherche = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .textSearch("title", `%${query}%`);
    if (error) {
      console.error(error);
    } else {
      setResultats(data as never[]);
    }
  };

  console.log(resultats);
  return (
    <SafeAreaView className="h-full bg-white">
      <View className="p-5">
        <View className=" mt-5  " style={{ paddingBottom: 10 }}>
          <Text className=" text-2xl font-bold">Resultats pour: {query}</Text>
          <FlatList
            data={resultats}
            numColumns={2}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <ScrollView key={index} style={{ paddingBottom: 10 }}>
                <TouchableOpacity
                  onPress={() => router.navigate("/product/details" as any)}
                >
                  <View style={{ margin: 5, width: 180 }}>
                    <Card style={{ width: "100%" }}>
                      <ProductsImage
                        path={item?.imageUrl}
                        fallback={"product image"}
                        style={{
                          height: 200,
                          width: "100%",
                          objectFit: "cover",
                        }}
                      />

                      <Chip
                        onPress={() => console.log("Pressed")}
                        style={{ marginVertical: 5, marginHorizontal: 5 }}
                        className=" text-sm"
                      >
                        {item?.category}
                      </Chip>
                      <Card.Content>
                        <Badge
                          size={25}
                          style={{ alignSelf: "flex-start" }}
                          className="font-bold"
                        >
                          {item?.price ? `${item.price} €` : ""}
                        </Badge>
                        <Text variant="titleSmall" numberOfLines={1}>
                          {item?.title}{" "}
                        </Text>
                        <Text variant="bodySmall" numberOfLines={1}>
                          {item?.desc}{" "}
                        </Text>
                      </Card.Content>
                    </Card>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            )}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default search;

const styles = StyleSheet.create({});
