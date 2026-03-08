import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  ImageBackground,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getAllEpisodes, getDetailDrama } from "../services/api";
import { Episode } from "../types/episode";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

export default function EpisodeScreen({ route, navigation }: any) {
  const { bookId, title } = route.params ?? {};
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!bookId) return;
    fetchData();
  }, [bookId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [epsData, detailData] = await Promise.all([
        getAllEpisodes(bookId),
        getDetailDrama(bookId),
      ]);
      setEpisodes(epsData);
      setDetail(detailData);
    } catch (e) {
      console.error("Gagal memuat detail drama:", e);
    } finally {
      setLoading(false);
    }
  };

  // Dummy tags jika book api tidak menyediakan tags spesifik
  const dummyTags = ["Romance", "Fantasy", "Wuxia"];

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#FF4757" />
        <Text style={{ marginTop: 10, color: "#666" }}>Memuat Detail...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* HERO IMAGE & HEADER */}
        <View style={styles.heroContainer}>
          <ImageBackground
            source={{ uri: detail?.coverWap || "https://via.placeholder.com/400x600" }}
            style={styles.heroImage}
            resizeMode="cover"
          >
            {/* Top Toolbar */}
            <View style={[styles.toolbar, { paddingTop: insets.top + 10 }]}>
              <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.toolbarRight}>
                <TouchableOpacity style={styles.iconButton}>
                  <Ionicons name="share-social-outline" size={22} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconButton, { marginLeft: 10 }]}>
                  <Ionicons name="heart-outline" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Gradient memudar ke Background Utama (Putih) */}
            <LinearGradient
              colors={["transparent", "rgba(255,255,255,0.8)", "#FFFFFF"]}
              style={styles.heroGradient}
            />
          </ImageBackground>
        </View>

        {/* DETAIL CONTENT */}
        <View style={styles.contentContainer}>
          
          {/* TITLE */}
          <Text style={styles.titleText}>{detail?.bookName || title}</Text>
          
          {/* STATS: Score, Year, Episodes */}
          <View style={styles.statsRow}>
            <Ionicons name="star" size={16} color="#FF4757" />
            <Text style={styles.scoreText}>{(Math.random() * 2 + 8).toFixed(1)}</Text>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={styles.statText}>2024</Text>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={styles.statText}>{episodes.length} Episodes</Text>
          </View>

          {/* TAGS */}
          <View style={styles.tagsRow}>
            {dummyTags.map((tag, i) => (
              <View key={i} style={styles.tagBadge}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.watchButton} 
              activeOpacity={0.8}
              onPress={() => {
                if (episodes.length > 0) {
                  navigation.navigate("Video", { episode: episodes[0], episodes });
                }
              }}
            >
              <Ionicons name="play-circle" size={24} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.watchButtonText}>Watch Now</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton}>
              <Ionicons name="add-circle-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* SYNOPSIS */}
          <Text style={styles.sectionTitle}>Synopsis</Text>
          <Text style={styles.synopsisText} numberOfLines={5}>
            {detail?.introduction || 
             "A low-ranking fairy inadvertently accidentally frees the dreaded Moon Supreme... To regain his freedom he must sacrifice the fairy's soul. However, in the process, the heartless demon finds himself falling for the gentle fairy."}
          </Text>

          {/* EPISODES LIST (VERTICAL) */}
          <View style={styles.episodeHeader}>
            <Text style={styles.sectionTitle}>Episodes</Text>
          </View>

          <FlatList
            scrollEnabled={false} // Matikan scrolling bawaan karena file ini sudah dibungkus ScrollView utama
            data={episodes}
            keyExtractor={(item) => item.chapterId}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={styles.episodeCardVertical}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("Video", { episode: item, episodes })}
              >
                <View style={styles.episodeImageWrapperVert}>
                  <Image source={{ uri: item.chapterImg || detail?.coverWap }} style={styles.episodeImageVertical} />
                  <View style={styles.episodeDurationBadge}>
                    <Text style={styles.episodeDurationText}>02:00</Text>
                  </View>
                </View>

                <View style={styles.episodeInfoVert}>
                  <Text style={styles.episodeCardTitle} numberOfLines={1}>Episode {index + 1}</Text>
                  <Text style={styles.episodeCardSubtitle} numberOfLines={2}>{item.chapterName}</Text>
                </View>
              </TouchableOpacity>
            )}
          />

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  heroContainer: {
    width: width,
    height: height * 0.55, 
  },
  heroImage: {
    width: "100%",
    height: "100%",
    justifyContent: "space-between",
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  toolbarRight: {
    flexDirection: "row",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroGradient: {
    height: 120,
    width: "100%",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    marginTop: -20, // Menarik konten naik sedikit menyatu dengan gradient
  },
  titleText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#001F3F", // Warna biru sangat gelap hampir hitam
    marginBottom: 8,
    lineHeight: 32,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF4757",
    marginLeft: 4,
  },
  dotSeparator: {
    fontSize: 14,
    color: "#999",
    marginHorizontal: 8,
  },
  statText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "500",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    gap: 8,
  },
  tagBadge: {
    backgroundColor: "#FFE5E8", // Pink sangat pudar
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: "#FF4757",
    fontSize: 12,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  watchButton: {
    flex: 1, // Mengambil ruang tersisa penuh
    backgroundColor: "#FF4757",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#FF4757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  watchButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    width: 50,
    height: 50,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#001F3F",
    marginBottom: 8,
  },
  synopsisText: {
    fontSize: 14,
    color: "#4B5563", // Abu-abu tulisan 
    lineHeight: 22,
    marginBottom: 24,
  },
  episodeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  episodeCardVertical: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 12,
  },
  episodeImageWrapperVert: {
    width: 120,
    height: 70,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 14,
  },
  episodeImageVertical: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  episodeInfoVert: {
    flex: 1,
    justifyContent: "center",
  },
  episodeDurationBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  episodeDurationText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  episodeCardTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#001F3F",
    marginBottom: 4,
  },
  episodeCardSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
});
