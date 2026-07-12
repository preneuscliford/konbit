import {
  FlatList,
  GestureResponderEvent,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import AntDesign from "@expo/vector-icons/AntDesign";
import { useAuth } from "@/app/provider/AuthProvider";
import { supabase } from "@/lib/supabase";
import RemoteImage from "@/components/RemoteImage";
import {
  MaterialIcons,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useEffect, useState } from "react";
import RenderHTML from "react-native-render-html";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { Image } from "expo-image";
import { CircleUserRound } from "lucide-react-native";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import DeleteAccountButton from "@/components/account/deleteAccount";

type Post = {
  id: string;
  created_at: string;
  body: string;
  userId: string;
};

type Product = {
  id: string;
  title: string;
  desc: string;
  price: number;
  imageUrl: string;
  category: string;
};
const EditProfil = () => {
  const { session, user, userData } = useAuth();
  // const [userData, setUserData] = useState<UserData | null>(null);

  const [activeTab, setActiveTab] = useState<"posts" | "products">("products");
  const [posts, setPosts] = useState<Post[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const router = useRouter();

  // ... Gardez les fonctions existantes getProfile et getUserProducts ...
  useEffect(() => {
    if (session?.user.id) {
      if (activeTab === "products") {
        loadProducts();
      } else {
        loadPosts();
      }
    }
  }, [session, activeTab]);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", session!.user.id);

    if (!error) setProducts(data as Product[]);
  };

  const loadPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("userId", session!.user.id)
      .order("created_at", { ascending: false });

    if (!error) setPosts(data as Post[]);
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity className="p-4 bg-white rounded-xl shadow-md mb-4">
      {/* <RemoteImage
        path={item.imageUrl}
        className="w-full h-48 rounded-lg mb-2"
        fallback="product-placeholder"
      />
      <View className="flex-row justify-between items-start">
        <Text className="text-lg font-semibold flex-1">{item.title}</Text>
        <Text className="text-blue-600 font-bold">€{item.price}</Text>
      </View>
      <Text className="text-gray-500 text-sm">{item.category}</Text>
      <Text className="text-gray-700 mt-1" numberOfLines={2}>
        {item.desc}
      </Text> */}
    </TouchableOpacity>
  );

  const renderPostItem = ({ item }: { item: Post }) => (
    <View className="p-4 bg-white rounded-xl shadow-md mb-4">
      {/* <Text className="text-gray-500 text-sm mb-2">
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
      <RenderHTML
        contentWidth={300}
        source={{ html: item.body }}
        baseStyle={{ fontSize: 16, lineHeight: 24 }}
      /> */}
    </View>
  );

  const handleSignOut = async () => {
    try {
      // Déconnexion de Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Révocation du token Google
      await GoogleSignin.signOut();

      // Rediriger vers la page de connexion ou autre
      router.push("/(auth)/signIn");
    } catch (error) {
      console.error("Erreur lors de la déconnexion :", error);
    }
  };

  return (
    <View className="flex-1 bg-gray-100">
      <StatusBar style="light" />
      <View
        style={{ height: hp("25%") }}
        className="bg-slate-950 rounded-br-[80px] px-4"
      >
        <View
          style={{ paddingTop: hp("8%") }}
          className="flex-row justify-between items-center"
        >
          <Text style={{ fontSize: wp("5%") }} className="text-white font-bold">
            Profil
          </Text>
          <Link href={"/(tabs)/(profile)/editProfile"}>
            <AntDesign name="edit" size={wp("6%")} color="white" />
          </Link>
        </View>
      </View>

      {/* Contenu principal */}
      <ScrollView
        scrollEnabled={true}
        className="flex-1 px-4"
        style={{ marginTop: -hp("10%") }}
      >
        {/* Carte profil */}
        <View className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <View className="items-center">
            {userData?.avatar_url?.startsWith("https://") ? (
              <View className="flex-col items-center">
                <Image
                  source={{ uri: userData?.avatar_url }}
                  style={{
                    width: wp("10%"),
                    height: wp("10%"),
                    borderRadius: wp("5%"),
                  }}
                />
                <Text
                  style={{ fontSize: wp("6%") }}
                  className="font-bold text-gray-900"
                >
                  {userData?.full_name || userData?.username}
                </Text>
              </View>
            ) : (
              <View className="flex-col items-center">
                {userData?.avatar_url ? (
                  <RemoteImage
                    path={userData?.avatar_url}
                    fallback="profile-placeholder"
                    style={{
                      width: wp("20%"),
                      height: wp("20%"),
                      borderRadius: wp("10%"),
                    }}
                  />
                ) : (
                  <CircleUserRound color="black" size={wp("8%")} />
                )}
                <Text
                  style={{ fontSize: wp("6%") }}
                  className="font-bold text-gray-900"
                >
                  {userData?.full_name || userData?.username}
                </Text>
              </View>
            )}
          </View>
          <View className="items-center">
            <Text className="text-gray-500 mt-1">{session?.user?.email}</Text>
          </View>
        </View>

        <View className="mb-8">
          <Text
            style={{ fontSize: wp("4.5%") }}
            className="font-bold text-gray-900 mb-4"
          >
            Mon compte
          </Text>

          <View className="grid grid-cols-3 gap-4 mb-6">
            {/* Bouton Paramètres */}
            <TouchableOpacity
              style={{ padding: wp("4%") }}
              className="items-center bg-white rounded-xl shadow-sm"
            >
              <Feather name="settings" size={wp("6%")} color="#0a7ea4" />
              <Text
                style={{ fontSize: wp("3.5%") }}
                className="text-gray-700 mt-2"
              >
                Paramètres
              </Text>
            </TouchableOpacity>

            {/* Bouton Favoris */}
            <TouchableOpacity
              className="items-center p-4 bg-white rounded-xl shadow-sm"
              // onPress={() => router.push("/favorites")}
            >
              <MaterialCommunityIcons
                name="heart-outline"
                size={24}
                color="#0a7ea4"
              />
              <Text className="text-sm text-gray-700 mt-2">Favoris</Text>
              <View className="absolute top-2 right-2 bg-red-500 w-5 h-5 rounded-full items-center justify-center">
                <Text className="text-white text-xs">3</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              className="items-center p-4 bg-white rounded-xl shadow-sm"
              // onPress={() => router.push("/favorites")}
            >
              <MaterialCommunityIcons
                name="post-outline"
                size={24}
                color="#0a7ea4"
              />
              <Text className="text-sm text-gray-700 mt-2">Mes Posts</Text>
              <View className="absolute top-2 right-2 bg-red-500 w-5 h-5 rounded-full items-center justify-center">
                <Text className="text-white text-xs">1</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bouton de déconnexion */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="border border-red-500 rounded-xl py-4 mb-8"
        >
          <Text className="text-red-600 text-center font-semibold">
            Se déconnecter
          </Text>
        </TouchableOpacity>
        <DeleteAccountButton />
      </ScrollView>
    </View>
  );
};

export default EditProfil;
