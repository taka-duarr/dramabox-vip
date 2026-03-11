import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { getNetshortForYou } from "../services/api";
import { NetshortContentInfo } from "../types/netshort";
import { StatusBar } from "expo-status-bar";
import Swiper from "react-native-swiper";

// For Server 2, we only have one type of content for now: "For You"
type TabType = "foryou";

const HomeScreen2: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<TabType>("foryou");
  const [forYouDramas, setForYouDramas] = useState<NetshortContentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchForYou = async () => {
    try {
      setLoading(true);
      const res = await getNetshortForYou(1);
      setForYouDramas(res.contentInfos || []);
      setPage(1);
      setHasMore((res.contentInfos?.length || 0) > 0);
    } catch (e) {
      console.error("Gagal fetch for you Server 2:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchNextPage = async () => {
    if (isFetchingMore || !hasMore || loading) return;

    try {
      setIsFetchingMore(true);
      const nextPage = page + 1;
      const res = await getNetshortForYou(nextPage);
      
      if (res.contentInfos && res.contentInfos.length > 0) {
        setForYouDramas((prev) => [...prev, ...res.contentInfos]);
        setPage(nextPage);
      } else {
        setHasMore(false); // Tidak ada data lagi
      }
    } catch (e) {
      console.error("Gagal fetch next page Server 2:", e);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 500; // Load next page when 500px from bottom
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      fetchNextPage();
    }
  };

  useEffect(() => {
    fetchForYou();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchForYou();
  };

  const currentData = forYouDramas;
  const currentTabTitle = "Rekomendasi Server 2";
  const currentSubtitle = "Drama yang direkomendasikan untuk Anda dari Server 2";

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF4757" />
      </View>
    );
  }

  // helper to ensure image string parses without malformed encoding issues
  const safeImageUrl = (url?: string) => {
    if (!url) return "https://via.placeholder.com/60x80";
    // Many React Native versions or Expo Image modules struggle with Chinese characters in URIs
    const encoded = url.replace(/比/g, "%E6%AF%94");
    
    // Workaround for broken SSL certificates on awscover.netshort.com
    // Native Mobile (Android/iOS) STRICTLY blocks leaf signatures and fails silently.
    if (encoded.includes("awscover.netshort.com")) {
      const strippedProtocol = encoded.replace(/^https?:\/\//, "");
      return `https://wsrv.nl/?url=${strippedProtocol}`;
    }
    
    return encoded;
  };

  const renderDramaItem = (item: NetshortContentInfo, index: number) => (
    <TouchableOpacity
      style={styles.dramaCard}
      key={item.shortPlayId}
      onPress={() =>
        navigation.navigate("Episode2", {
          bookId: item.shortPlayId,
          title: item.shortPlayName,
        })
      }
    >
      <View style={styles.cardContent}>
        <View style={[styles.numberContainer, styles.vipNumber]}>
          <Text style={styles.numberText}>{index + 1}</Text>
        </View>

        <Image
          source={{ uri: safeImageUrl(item.shortPlayCover) }}
          style={styles.coverImage}
        />

        <View style={styles.dramaInfo}>
          <Text style={styles.dramaTitle} numberOfLines={2}>
            {item.shortPlayName || "Unknown Drama"}
          </Text>

          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>
              {item.isNewLabel ? "Baru" : "Latest"} •{" "}
              {item.scriptName || "?"}
            </Text>
          </View>

          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {item.heatScoreShow || "0"}
            </Text>
          </View>
        </View>
      </View>

      {index < currentData.length - 1 && <View style={styles.divider} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.header}>
        {/* TOP ROW: LOGO + TITLE + CREDIT */}
        <View style={styles.headerTop}>
          {/* Logo di kiri */}
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Title di tengah */}
          <Text style={styles.headerTitle}>MyDrama S2</Text>

          {/* Credit di kanan */}
          <TouchableOpacity
            style={styles.creditBadge}
            onPress={() => navigation.navigate("About")}
          >
            <Text style={styles.creditText}>by taka</Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH BOX */}
        <TouchableOpacity
          style={styles.searchBox}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Search2")}
        >
          <Text style={styles.searchPlaceholder}>Cari drama Server 2...</Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT WITH SLIDER & TABS */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FF4757"]}
            tintColor="#FF4757"
          />
        }
      >
        {/* HERO SLIDER (Ikut Terscroll) */}
        <View style={{ zIndex: 0 }}>
          {forYouDramas.length > 0 && (
            <View style={styles.sliderContainer}>
              <Swiper
                autoplay
                autoplayTimeout={4}
                showsPagination={true}
                dotStyle={styles.dot}
                activeDotStyle={styles.activeDot}
              >
                {forYouDramas.slice(0, 5).map((item) => (
                  <TouchableOpacity
                    key={item.shortPlayId}
                    style={styles.slide}
                    activeOpacity={0.9}
                    onPress={() =>
                      navigation.navigate("Episode2", {
                        bookId: item.shortPlayId,
                        title: item.shortPlayName,
                      })
                    }
                  >
                    {/* Efek simetris gambar potrait - menggunakan warna bg gelap & resizeMode "contain" vertikal */}
                    <View style={styles.imageWrapper}>
                      <Image
                        source={{ uri: safeImageUrl(item.shortPlayCover) }}
                        style={styles.slideImgPortrait}
                      />
                    </View>
                    <View style={styles.slideOverlay}>
                      <Text style={styles.slideTitle} numberOfLines={1}>
                        {item.shortPlayName}
                      </Text>
                      <Text style={styles.slideSubtitle}>
                        {item.scriptName}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </Swiper>
            </View>
          )}
        </View>

        {/* TAB SELECTOR (Sticky - Tertahan Saat Mentok Atas) */}
        <View style={{ backgroundColor: "#000000", zIndex: 10 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabScrollContainer}
            contentContainerStyle={styles.tabContentContainer}
          >
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "foryou" && styles.activeTab,
              ]}
              onPress={() => setActiveTab("foryou")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "foryou" && styles.activeTabText,
                ]}
              >
                ✨ For You Server 2 ({forYouDramas.length})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{currentTabTitle}</Text>
          <Text style={styles.sectionSubtitle}>{currentSubtitle}</Text>
        </View>

        <View style={styles.dramaListContainer}>
          {currentData.length > 0 ? (
            currentData.map((item, index) => renderDramaItem(item, index))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Tidak ada drama di kategori ini
              </Text>
              <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading Indicator for Next Page */}
          {isFetchingMore && (
            <View style={{ paddingVertical: 20 }}>
              <ActivityIndicator size="small" color="#FF4757" />
            </View>
          )}
        </View>

        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>
            Menampilkan {currentData.length} drama
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeScreen2;

/* ⬇⬇⬇ STYLES (Identik dengan HomeScreen.tsx) */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  headerTitle: {
    color: "#000000",
    fontSize: 22,
    fontWeight: "700",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F4F7",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchPlaceholder: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  tabScrollContainer: {
    maxHeight: 48,
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
  },
  tabContentContainer: {
    paddingHorizontal: 12,
    gap: 8,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#F2F4F7",
    height: 32,
    justifyContent: "center",
  },
  activeTab: {
    backgroundColor: "#FF4757",
  },
  tabText: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#000000",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: "#666666",
    fontSize: 12,
  },

  /* SLIDER STYLES (Potret Simetris) */
  sliderContainer: {
    height: 380, // Mengakomodasi poster panjang
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 25,
  },
  slide: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  imageWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E5E7EB", // latar abu soft jika gambar tak penuh
  },
  slideImgPortrait: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    opacity: 1,
  },
  slideOverlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  slideTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  slideSubtitle: {
    color: "#ccc",
    fontSize: 12,
  },
  dot: {
    backgroundColor: "rgba(0,0,0,0.2)",
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
    marginBottom: -20,
  },
  activeDot: {
    backgroundColor: "#FF4757",
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
    marginBottom: -20,
  },

  dramaListContainer: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    borderColor: "#EEEEEE",
    borderWidth: 1,
  },
  dramaCard: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  numberContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  vipNumber: {
    backgroundColor: "#FF4757",
  },
  latestNumber: {
    backgroundColor: "#4D65ED",
  },
  numberText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  coverImage: {
    width: 56,
    height: 74,
    borderRadius: 6,
    marginRight: 12,
  },
  dramaInfo: {
    flex: 1,
  },
  dramaTitle: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
    lineHeight: 20,
  },
  badgeContainer: {
    backgroundColor: "#F2F4F7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  badgeText: {
    color: "#666666",
    fontSize: 10,
    fontWeight: "500",
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statsText: {
    color: "#FF4757",
    fontSize: 13,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#F2F4F7",
    marginLeft: 36,
    marginTop: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#888888",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#333333",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  totalContainer: {
    marginHorizontal: 16,
    marginBottom: 30,
    padding: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    alignItems: "center",
    borderColor: "#E5E7EB",
    borderWidth: 1,
  },
  totalText: {
    color: "#6B7280",
    fontSize: 12,
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  creditBadge: {
    backgroundColor: "rgba(255, 71, 87, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 71, 87, 0.4)",
  },
  creditText: {
    color: "#FF4757",
    fontSize: 10,
    fontWeight: "600",
  },
});
