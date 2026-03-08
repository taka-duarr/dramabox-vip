import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { getSearchDrama } from "../services/api";

const { width } = Dimensions.get("window");
const CARD_MARGIN = 8;
const CARD_WIDTH = width / 2 - 16 - CARD_MARGIN; // 16 padding Container layar

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

  const clearSearch = () => {
    setQuery("");
    setResults([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* STATUS BAR MODE TERANG MEMANCAR */}
      <StatusBar style="dark" backgroundColor="#FAFAFA" />

      {/* HEADER SEARCH BAR MELENGKUNG CERAH */}
      <View style={styles.searchHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color="#0F172A" />
        </TouchableOpacity>
        
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#FF4757" style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Ketik judul drama..."
            placeholderTextColor="#94A3B8"
            style={styles.input}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* RESULT INDCATOR (Tampil jika array ketemu) */}
      {!loading && results.length > 0 && query.trim() !== "" && (
        <View style={styles.resultInfoContainer}>
          <Text style={styles.resultTitle}>
            Search Results for{" "}
            <Text style={styles.resultQuery}>"{query}"</Text>
          </Text>
          <Text style={styles.resultCount}>
            <Text style={styles.resultCountNumber}>{results.length}</Text>{"\n"}FOUND
          </Text>
        </View>
      )}

      {/* ANIMASI LOADING DI TENGAH */}
      {loading && <ActivityIndicator size="large" color="#FF4757" style={styles.loader} />}

      {/* RESULT LIST DALAM 2 KOLOM GRID */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.bookId}
        numColumns={2}
        columnWrapperStyle={styles.rowWrapper}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          // Fallback estetis: ambil 2 tag pertama dan tahun buatan bila spesifikasi API absen
          const genres = item.tagNames && item.tagNames.length > 0 
            ? item.tagNames.slice(0, 2).join(", ") 
            : "Drama, Asia";
          const year = "2023"; // Angka penambah aksen visual

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate("Episode", {
                  bookId: item.bookId,
                  title: item.bookName,
                })
              }
            >
              <View style={styles.imageContainer}>
                <Image source={{ uri: item.cover }} style={styles.image} />
                
                {/* LENCANA RATING BINTANG KANAN-ATAS */}
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color="#FBBF24" />
                  <Text style={styles.ratingText}>8.9</Text>
                </View>

                
              </View>

              {/* JUDUL DAN SUBTITLE (Genre & Tahun) */}
              <Text style={styles.title} numberOfLines={1}>
                {item.bookName}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {genres} • {year}
              </Text>
            </TouchableOpacity>
          );
        }}
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

export default SearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Sentuhan Putih-BiruSangatPucat terang
  },

  /* HEADER PENACARIAN */
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
    backgroundColor: "#FEF2F2", // Latar Merah/Krem Sangat Muda
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1.5,
    borderColor: "#FEE2E2",
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

  /* INDIKASI HASIL COUNT */
  resultInfoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0F172A", // Biru Navy Gelap
    flex: 1,
    marginRight: 16,
    lineHeight: 28,
  },
  resultQuery: {
    color: "#0F172A", 
  },
  resultCount: {
    fontSize: 10,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 14,
    marginTop: 2,
  },
  resultCountNumber: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "bold",
  },
  
  /* FLATLIST GRID 2 KOLOM */
  loader: {
    marginTop: 40,
  },
  listContainer: {
    paddingHorizontal: 16 - CARD_MARGIN / 2, // Mengimbangi pembatas jarak Card di dalam
    paddingBottom: 40,
  },
  rowWrapper: {
    justifyContent: "space-between",
  },
  
  /* DESAIN SEL ITEM KARTU KOTAK */
  card: {
    width: CARD_WIDTH,
    marginBottom: 24,
    marginHorizontal: CARD_MARGIN / 2,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 0.65, // Rasio Memanjang Ke Bawah (Portrait)
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
    backgroundColor: "#E2E8F0", // Warna Dasar penungggu keluat (*Placeholder*)
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  
  /* LENCANA DAN TEMPELAN ABSOLUT */
  ratingBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(15, 23, 42, 0.8)", // Semi Navy
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
    marginLeft: 4,
  },
  hotBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "#EF4444", // Solid Red
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hotText: {
    color: "white",
    fontSize: 11,
    fontWeight: "900",
  },
  
  /* JUDUL DAN INFO KETERANGAN BAWAH */
  title: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 12,
  },
  
  /* KOSONG/TIDAK KETEMU */
  emptyContainer: {
    marginTop: 60,
    alignItems: "center",
  },
  empty: {
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "500",
  },
});
