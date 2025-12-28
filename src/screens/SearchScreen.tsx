import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { getSearchDrama } from "../services/api";

const SearchScreen = ({ navigation }: any) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      const data = await getSearchDrama(query);
      setResults(data);
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setLoading(false);
    }
  };

return (
  <SafeAreaView style={styles.container}>
    <StatusBar style="light" backgroundColor="#121212" />

    {/* SEARCH BAR */}
    <View style={styles.searchBar}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Cari drama..."
        placeholderTextColor="#888"
        style={styles.input}
        onSubmitEditing={handleSearch}
      />
      <TouchableOpacity onPress={handleSearch}>
        <Text style={styles.searchBtn}>Cari</Text>
      </TouchableOpacity>
    </View>

    {/* LOADING */}
    {loading && <ActivityIndicator color="#FF4757" />}

    {/* RESULT */}
    <FlatList
      data={results}
      keyExtractor={(item) => item.bookId}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate("Episode", {
              bookId: item.bookId,
              title: item.bookName,
            })
          }
        >
          <Image source={{ uri: item.cover }} style={styles.image} />
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>
              {item.bookName}
            </Text>
            <Text style={styles.desc} numberOfLines={3}>
              {item.introduction}
            </Text>

            <View style={styles.tagRow}>
              {item.tagNames?.slice(0, 3).map((tag: string) => (
                <Text key={tag} style={styles.tag}>
                  {tag}
                </Text>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        !loading ? <Text style={styles.empty}>Tidak ada hasil</Text> : null
      }
    />
  </SafeAreaView>
);

};

export default SearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 20,
  },

  searchBar: {
    flexDirection: "row",
    backgroundColor: "#1A1A1A",
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  input: {
    flex: 1,
    color: "white",
    height: 40,
  },
  searchBtn: {
    color: "#FF4757",
    fontWeight: "600",
  },
  card: {
    flexDirection: "row",
    marginBottom: 16,
  },
  image: {
    width: 80,
    height: 110,
    borderRadius: 8,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  title: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  desc: {
    color: "#AAA",
    fontSize: 13,
    marginTop: 4,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
  tag: {
    backgroundColor: "#333",
    color: "#CCC",
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  empty: {
    color: "#888",
    textAlign: "center",
    marginTop: 40,
  },
});
