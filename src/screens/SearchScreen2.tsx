import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { getNetshortSearch } from "../services/api";

const { width } = Dimensions.get("window");
const CARD_MARGIN = 8;
const CARD_WIDTH = width / 2 - 16 - CARD_MARGIN;

const SearchScreen2 = ({ navigation }: any) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      const data = await getNetshortSearch(query);
      // Netshort search response has contentInfos array
      setResults(data.contentInfos || []);
    } catch (e) {
      console.error("Server 2 Search error:", e);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
  };

  const safeImageUrl = (url?: string) => {
    if (!url) return "https://via.placeholder.com/400x600";
    const encoded = url.replace(/比/g, "%E6%AF%94");
    if (encoded.includes("awscover.netshort.com")) {
      const strippedProtocol = encoded.replace(/^https?:\/\//, "");
      return `https://wsrv.nl/?url=${strippedProtocol}`;
    }
    return encoded;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="#F8FAFC" />

      <View style={styles.searchHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color="#0F172A" />
        </TouchableOpacity>
        
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#FF4757" style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cari drama Server 2..."
            placeholderTextColor="#94A3B8"
            style={styles.input}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus={true}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!loading && results.length > 0 && query.trim() !== "" && (
        <View style={styles.resultInfoContainer}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            Hasil Server 2: <Text style={styles.resultQuery}>"{query}"</Text>
          </Text>
          <Text style={styles.resultCount}>
             Ditemukan{"\n"}<Text style={styles.resultCountNumber}>{results.length}</Text>
          </Text>
        </View>
      )}

      {loading && <ActivityIndicator size="large" color="#FF4757" style={styles.loader} />}

      <FlatList
        data={results}
        keyExtractor={(item) => item.shortPlayId}
        numColumns={2}
        columnWrapperStyle={styles.rowWrapper}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate("Episode2", {
                bookId: item.shortPlayId,
                title: item.shortPlayName,
              })
            }
          >
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: safeImageUrl(item.shortPlayCover) }} 
                style={styles.image} 
              />
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#FBBF24" />
                <Text style={styles.ratingText}>{item.heatScoreShow || "8.5"}</Text>
              </View>
            </View>

            <Text style={styles.title} numberOfLines={2}>
              {item.shortPlayName}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {item.scriptName || "Drama Server 2"}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading && query ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.empty}>Oops, tidak ada pencarian untuk "{query}"</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

export default SearchScreen2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    marginRight: 14,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "500",
  },
  clearBtn: {
    padding: 6,
  },
  resultInfoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0F172A",
    flex: 1,
    marginRight: 16,
  },
  resultQuery: {
    color: "#64748B",
    fontWeight: "normal",
  },
  resultCount: {
    fontSize: 10,
    color: "#64748B",
    textAlign: "center",
  },
  resultCountNumber: {
    fontSize: 16,
    color: "#FF4757",
    fontWeight: "bold",
  },
  loader: {
    marginTop: 40,
  },
  listContainer: {
    paddingHorizontal: 16 - CARD_MARGIN / 2,
    paddingBottom: 40,
  },
  rowWrapper: {
    justifyContent: "space-between",
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: 20,
    marginHorizontal: CARD_MARGIN / 2,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 0.7,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: "#E2E8F0",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  ratingBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    marginLeft: 3,
  },
  title: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
    lineHeight: 18,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 12,
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: "center",
  },
  empty: {
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "500",
  },
});
