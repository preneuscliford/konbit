import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
} from "react-native";
import { Searchbar } from "react-native-paper";
import { router, usePathname } from "expo-router";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { supabase } from "@/lib/supabase";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

interface SearchResult {
  id: string;
  title: string;
  category: string;
}

const SearchInput = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data: konbits } = await supabase
        .from("konbits")
        .select("id, title, category")
        .ilike("title", `%${query}%`)
        .limit(8);

      setResults(konbits || []);
    } catch (error) {
      console.error("Erreur de recherche:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultPress = (result: SearchResult) => {
    router.push({
      pathname: "/(community)/konbitDetails",
      params: { konbitId: result.id },
    });
    setSearchQuery("");
    setResults([]);
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Rechercher événements, services..."
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.input}
        iconColor="#181F27"
        loading={isSearching}
        placeholderTextColor="#9CA3AF"
      />

      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={results}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleResultPress(item)}
              >
                <View style={styles.resultContent}>
                  <MaterialCommunityIcons
                    name="account-group-outline"
                    size={wp("5%")}
                    color="#00209F"
                  />
                  <View style={styles.resultTextContainer}>
                    <Text style={styles.resultTitle}>{item.title}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: hp("1%"),
    zIndex: 1000,
  },
  searchBar: {
    backgroundColor: "#FFFFFF",
    borderRadius: wp("4%"),
    height: hp("7%"),
    elevation: 2,
  },
  input: {
    fontSize: hp("1.8%"),
    textAlignVertical: "center",
    justifyContent: "center",
    includeFontPadding: false,
    paddingBottom: 0,
    paddingTop: 0,
  },
  resultsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: wp("3%"),
    marginTop: hp("1%"),
    maxHeight: hp("40%"),
    elevation: 3,
  },
  resultItem: {
    padding: wp("4%"),
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  resultContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("3%"),
  },
  resultTextContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: hp("1.8%"),
    color: "#1F2937",
    fontWeight: "500",
  },
  resultType: {
    fontSize: hp("1.4%"),
    color: "#6B7280",
    marginTop: hp("0.5%"),
  },
});

export default SearchInput;
