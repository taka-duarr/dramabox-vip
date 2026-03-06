import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import {
  getVipDrama,
  getLatestDrama,
  getTrendingDrama,
  getForYouDrama,
} from "../services/api";
import { Drama } from "../types/drama";
import { StatusBar } from "expo-status-bar";
import Swiper from "react-native-swiper";

type TabType = "vip" | "latest" | "trending" | "foryou";

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<TabType>("vip");
  const [trendingDramas, setTrendingDramas] = useState<Drama[]>([]);
  const [forYouDramas, setForYouDramas] = useState<Drama[]>([]);
  const [loadingForYou, setLoadingForYou] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [vipDramas, setVipDramas] = useState<Drama[]>([]);
  const [latestDramas, setLatestDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);

      const [vipRes, latestRes] = await Promise.all([
        getVipDrama(),
        getLatestDrama(),
      ]);

      const vipBooks = vipRes.columnVoList.flatMap((c: any) => c.bookList);
      const latestBooks = latestRes;

      setVipDramas(vipBooks);
      setLatestDramas(latestBooks);
    } catch (e) {
      console.error("Gagal fetch home:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTrending = async () => {
    try {
      setLoadingTrending(true);
      const res = await getTrendingDrama();
      setTrendingDramas(res);
    } catch (e) {
      console.error("Gagal fetch trending:", e);
    } finally {
      setLoadingTrending(false);
    }
  };

  const fetchForYou = async () => {
    try {
      setLoadingForYou(true);
      const res = await getForYouDrama();
      setForYouDramas(res);
    } catch (e) {
      console.error("Gagal fetch for you:", e);
    } finally {
      setLoadingForYou(false);
    }
  };

  useEffect(() => {
    if (activeTab === "trending" && trendingDramas.length === 0) {
      fetchTrending();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "foryou" && forYouDramas.length === 0) {
      fetchForYou();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchAll();
    // Memanggil fetchTrending di awal rendering agar Slider selalu terisi data
    fetchTrending();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
    fetchTrending();
    if (activeTab === "foryou") {
      fetchForYou();
    }
  };

  const currentData =
    activeTab === "vip"
      ? vipDramas
      : activeTab === "latest"
        ? latestDramas
        : activeTab === "trending"
          ? trendingDramas
          : forYouDramas;

  const currentTabTitle =
    activeTab === "vip"
      ? "🔥 VIP Drama"
      : activeTab === "latest"
        ? "🆕 Drama Terbaru"
        : activeTab === "trending"
          ? "📈 Drama Populer"
          : "✨ Rekomendasi Untukmu";

  const currentSubtitle =
    activeTab === "vip"
      ? "Drama premium eksklusif untuk member VIP"
      : activeTab === "latest"
        ? "Drama baru yang baru saja dirilis"
        : activeTab === "trending"
          ? "Drama paling populer saat ini"
          : "Drama yang cocok untuk seleramu";

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF4757" />
      </View>
    );
  }

  const renderDramaItem = (item: Drama, index: number) => (
    <TouchableOpacity
      style={styles.dramaCard}
      key={item.bookId}
      onPress={() =>
        navigation.navigate("Episode", {
          bookId: item.bookId,
          title: item.bookName,
        })
      }
    >
      <View style={styles.cardContent}>
        <View
          style={[
            styles.numberContainer,
            activeTab === "vip" ? styles.vipNumber : styles.latestNumber,
          ]}
        >
          <Text style={styles.numberText}>{index + 1}</Text>
        </View>

        <Image
          source={{ uri: item.coverWap || "https://via.placeholder.com/60x80" }}
          style={styles.coverImage}
        />

        <View style={styles.dramaInfo}>
          <Text style={styles.dramaTitle} numberOfLines={2}>
            {item.bookName || "Unknown Drama"}
          </Text>

          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>
              {activeTab === "vip" ? "VIP" : "Latest"} •{" "}
              {item.chapterCount || "?"} episode
            </Text>
          </View>

          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {(Math.random() * 20 + 1).toFixed(1)}M
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
          <Text style={styles.headerTitle}>MyDrama</Text>

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
          onPress={() => navigation.navigate("Search")}
        >
          <Text style={styles.searchPlaceholder}>Cari drama favoritmu...</Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT WITH SLIDER & TABS */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
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
          {trendingDramas.length > 0 && (
            <View style={styles.sliderContainer}>
              <Swiper
                autoplay
                autoplayTimeout={4}
                showsPagination={true}
                dotStyle={styles.dot}
                activeDotStyle={styles.activeDot}
              >
                {trendingDramas.slice(0, 5).map((item) => (
                  <TouchableOpacity
                    key={item.bookId}
                    style={styles.slide}
                    activeOpacity={0.9}
                    onPress={() =>
                      navigation.navigate("Episode", {
                        bookId: item.bookId,
                        title: item.bookName,
                      })
                    }
                  >
                    {/* Efek simetris gambar potrait - menggunakan warna bg gelap & resizeMode "contain" vertikal */}
                    <View style={styles.imageWrapper}>
                      <Image
                        source={{ uri: item.coverWap }}
                        style={styles.slideImgPortrait}
                      />
                    </View>
                    <View style={styles.slideOverlay}>
                      <Text style={styles.slideTitle} numberOfLines={1}>
                        {item.bookName}
                      </Text>
                      <Text style={styles.slideSubtitle}>
                        {item.chapterCount} Episode
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
                activeTab === "vip" && styles.activeTab,
              ]}
              onPress={() => setActiveTab("vip")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "vip" && styles.activeTabText,
                ]}
              >
                🔥 VIP ({vipDramas.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "latest" && styles.activeTab,
              ]}
              onPress={() => setActiveTab("latest")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "latest" && styles.activeTabText,
                ]}
              >
                🆕 Latest ({latestDramas.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "trending" && styles.activeTab,
              ]}
              onPress={() => setActiveTab("trending")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "trending" && styles.activeTabText,
                ]}
              >
                📈 Trending ({trendingDramas.length})
              </Text>
            </TouchableOpacity>

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
                ✨ For You ({forYouDramas.length})
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

export default HomeScreen;

/* ⬇⬇⬇ STYLES */
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
    elevation: 2, // Bayangan tipis di Android
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
