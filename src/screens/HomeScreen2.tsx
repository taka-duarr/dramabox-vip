import React, { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
  TextInput,
  useWindowDimensions,
  DimensionValue,
} from "react-native";
import { Image } from "expo-image";
import { getNetshortForYou } from "../services/api";
import { NetshortContentInfo } from "../types/netshort";
import { StatusBar } from "expo-status-bar";
import Swiper from "react-native-swiper";
import { useTheme } from "../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

const isWeb = Platform.OS === "web";

// For Server 2, we only have one type of content for now: "For You"
type TabType = "foryou";

const HomeScreen2: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>("foryou");
  const [searchQuery, setSearchQuery] = useState("");
  const [forYouDramas, setForYouDramas] = useState<NetshortContentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

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
        setHasMore(false);
      }
    } catch (e) {
      console.error("Gagal fetch next page Server 2:", e);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 500;
    if (
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom
    ) {
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

  // helper to ensure image string parses without malformed encoding issues
  const safeImageUrl = (url?: string) => {
    if (!url) return "https://via.placeholder.com/180x240";
    const encoded = url.replace(/比/g, "%E6%AF%94");
    if (encoded.includes("awscover.netshort.com")) {
      const strippedProtocol = encoded.replace(/^https?:\/\//, "");
      return `https://wsrv.nl/?url=${strippedProtocol}`;
    }
    return encoded;
  };

  const currentData = (() => {
    const raw = forYouDramas;
    if (!searchQuery.trim()) return raw;
    const q = searchQuery.toLowerCase();
    return raw.filter((d) => d.shortPlayName?.toLowerCase().includes(q));
  })();

  const currentTabTitle = "Special Untukmu";
  const currentSubtitle = "Drama pilihan yang wajib kamu tonton hari ini";

  if (loading && !refreshing) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Grid card ala Epic Games — cover image besar di atas, info di bawah
  const renderDramaItem = (item: NetshortContentInfo, index: number, cardWidth: DimensionValue) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, width: cardWidth }]}
      key={item.shortPlayId}
      activeOpacity={0.82}
      onPress={() =>
        navigation.navigate("Episode2", {
          bookId: item.shortPlayId,
          title: item.shortPlayName,
        })
      }
    >
      {/* Cover Image */}
      <View style={styles.cardImageWrap}>
        <Image
          source={{ uri: safeImageUrl(item.shortPlayCover) }}
          style={styles.cardImage}
          contentFit="cover"
        />
        {/* Rank badge */}
        <View style={[styles.rankBadge, { backgroundColor: colors.accent }]}>
          <Text style={styles.rankText}>#{index + 1}</Text>
        </View>
        {/* Type badge */}
        <View
          style={[styles.typeBadge, { backgroundColor: "rgba(0,0,0,0.6)" }]}
        >
          <Text style={styles.typeText}>
            {item.isNewLabel ? "NEW" : "FOR YOU"}
          </Text>
        </View>
      </View>

      {/* Card Info */}
      <View style={styles.cardInfo}>
        <Text
          style={[styles.cardTitle, { color: colors.text }]}
          numberOfLines={2}
        >
          {item.shortPlayName || "Unknown Drama"}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={[styles.cardEpisode, { color: colors.textSecondary }]}>
            {item.scriptName || "Drama"}
          </Text>
          <Text style={[styles.cardViews, { color: colors.accent }]}>
            {item.heatScoreShow || "0"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar
        style={isDark ? "light" : "dark"}
        backgroundColor={colors.sidebar}
      />

      <View
        style={[
          styles.header,
          { backgroundColor: colors.sidebar, borderBottomColor: colors.border },
        ]}
      >
        {/* Mobile Top Welcome Header */}
        {!isDesktop && (
          <View style={styles.mobileWelcomeRow}>
            <View style={styles.mobileWelcomeTextCol}>
              <Text style={[styles.mobileWelcomeTitle, { color: colors.text }]}>Halo Hasan</Text>
              <Text style={[styles.mobileWelcomeSubtitle, { color: colors.textSecondary }]}>Tonton drama favoritmu di Mydrama</Text>
            </View>
            <View style={styles.mobileWelcomeRight}>
              <TouchableOpacity onPress={toggleTheme} style={styles.mobileThemeBtn} activeOpacity={0.7}>
                <Ionicons name={isDark ? "sunny" : "moon"} size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate("ProfileTab")} activeOpacity={0.8}>
                <View style={[styles.mobileProfileAvatar, { backgroundColor: isDark ? "#2C2C2C" : "#EEE" }]}>
                  <Ionicons name="person" size={16} color={colors.accent} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.headerRow}>
          {/* Search Input dengan icon di kanan */}
          <View
            style={[styles.searchBar, { backgroundColor: colors.searchBg }]}
          >
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Cari drama Server 2..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={styles.searchIconWrap}
              onPress={() => {
                if (searchQuery.trim()) setSearchQuery("");
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={searchQuery ? "close" : "search"}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* CONTENT WITH SLIDER & TABS */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
      >
        {/* HERO CAROUSEL */}
        <View style={{ zIndex: 0 }}>
          {forYouDramas.length > 0 && (
            <View style={styles.heroContainer}>
              <Swiper
                showsButtons={false}
                autoplay
                autoplayTimeout={5}
                showsPagination
                dot={<View style={styles.heroDot} />}
                activeDot={
                  <View
                    style={[
                      styles.heroActiveDot,
                      { backgroundColor: colors.accent },
                    ]}
                  />
                }
              >
                {forYouDramas.slice(0, 5).map((item) => (
                  <View key={item.shortPlayId} style={styles.heroSlide}>
                    {/* Background cover image — fills the entire slide */}
                    <Image
                      source={{ uri: safeImageUrl(item.shortPlayCover) }}
                      style={styles.heroImage}
                      contentFit="cover"
                      blurRadius={isWeb ? 0 : 8}
                    />

                    {/* Dark overlay gradient */}
                    <LinearGradient
                      colors={[
                        "rgba(0,0,0,0.85)",
                        "rgba(0,0,0,0.6)",
                        "rgba(0,0,0,0.4)",
                        "rgba(0,0,0,0.7)",
                      ]}
                      style={styles.heroGradient}
                    />
                    {/* Bottom fade for dots */}
                    <View style={styles.heroGradBottom} />

                    {/* Content row: Poster + Info */}
                    <View style={styles.heroContentRow}>
                      {/* Poster preview */}
                      <View style={styles.heroPosterWrap}>
                        <Image
                          source={{ uri: safeImageUrl(item.shortPlayCover) }}
                          style={styles.heroPoster}
                          contentFit="cover"
                        />
                      </View>

                      {/* Info panel */}
                      <View style={styles.heroInfoPanel}>
                        <Text style={styles.heroLabel}>TRENDING</Text>

                        <Text style={styles.heroTitle} numberOfLines={2}>
                          {item.shortPlayName}
                        </Text>

                        <Text style={styles.heroEpisodeCount}>
                          {item.scriptName || "Drama"} • {item.heatScoreShow || "0"}
                        </Text>

                        <Text style={styles.heroDescription} numberOfLines={2}>
                          {item.shortPlayLabels || "Drama seru yang wajib kamu tonton, penuh aksi dan kejutan tak terduga."}
                        </Text>

                        <TouchableOpacity
                          style={[
                            styles.heroBtn,
                            { backgroundColor: colors.accent },
                          ]}
                          activeOpacity={0.85}
                          onPress={() =>
                            navigation.navigate("Episode2", {
                              bookId: item.shortPlayId,
                              title: item.shortPlayName,
                            })
                          }
                        >
                          <Ionicons
                            name="play"
                            size={14}
                            color="#FFF"
                            style={{ marginRight: 6 }}
                          />
                          <Text style={styles.heroBtnText}>Watch Now</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </Swiper>
            </View>
          )}
        </View>

        {/* TAB SELECTOR — underline minimalist */}
        <View style={{ backgroundColor: colors.bg, zIndex: 10 }}>
          <View
            style={[
              styles.tabBar,
              {
                backgroundColor: colors.sidebar,
                borderBottomColor: colors.border,
              },
            ]}
          >
            {(
              [
                { key: "foryou", label: "For You", count: forYouDramas.length },
              ] as const
            ).map((tab) => {
              const active = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.tabItem}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: active ? colors.text : colors.textSecondary },
                      active && styles.tabLabelActive,
                    ]}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <Text style={{ fontSize: 10, fontWeight: "400" }}>
                        {" "}
                        {tab.count}
                      </Text>
                    )}
                  </Text>
                  {/* Active underline */}
                  {active && (
                    <View
                      style={[
                        styles.tabUnderline,
                        { backgroundColor: colors.accent },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {currentTabTitle}
          </Text>
          <Text
            style={[styles.sectionSubtitle, { color: colors.textSecondary }]}
          >
            {currentSubtitle}
          </Text>
        </View>

        {/* Drama Grid — Epic Games style */}
        <View style={[styles.dramaGrid, { backgroundColor: colors.card }]}>
          {currentData.length > 0 ? (
            <View style={styles.gridRow}>
              {currentData.map((item, index) => {
                 let numColumns = 2;
                 if (width >= 1200) numColumns = 5;
                 else if (width >= 900) numColumns = 4;
                 else if (width >= 600) numColumns = 3;
                 
                 const cardWidth = `${100 / numColumns - 2}%` as DimensionValue; 
                 return renderDramaItem(item, index, cardWidth);
              })}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Tidak ada drama di kategori ini
              </Text>
              <TouchableOpacity
                onPress={onRefresh}
                style={[styles.retryButton, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.retryButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading Indicator for Next Page */}
          {isFetchingMore && (
            <View style={{ paddingVertical: 20 }}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          )}
        </View>

        <View style={[styles.totalContainer, { borderColor: colors.border }]}>
          <Text style={[styles.totalText, { color: colors.textMuted }]}>
            Menampilkan {currentData.length} drama
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeScreen2;

/* ⬇⬇⬇ STYLES (Identik dengan HomeScreen.tsx — Epic Games style) */
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
    paddingTop: isWeb ? 16 : 50,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  /* MOBILE WELCOME HEADER */
  mobileWelcomeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  mobileWelcomeTextCol: {
    flex: 1,
    justifyContent: "center",
    paddingRight: 10,
    marginTop: 20,
    marginBottom: 20,
  },
  mobileWelcomeTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
  },
  mobileWelcomeSubtitle: {
    fontSize: 11,
    fontWeight: "500",
  },
  mobileWelcomeRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mobileThemeBtn: {
    padding: 4,
  },
  mobileProfileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  /* Search bar — inline dengan icon kanan */
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    height: 40,
  },
  searchIconWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  /* TAB BAR — underline minimalist */
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  tabLabelActive: {
    fontWeight: "700",
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: "10%",
    right: "10%",
    height: 2,
    borderRadius: 1,
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

  /* HERO CAROUSEL — Poster + Info layout */
  heroContainer: {
    height: isWeb ? 280 : 220,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    overflow: "hidden",
  },
  heroSlide: {
    flex: 1,
    backgroundColor: "#0D0D0D",
    position: "relative",
  },
  /* Background image fills entire slide (blurred on mobile) */
  heroImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    ...(isWeb ? { filter: "blur(6px) brightness(0.4)", transform: [{ scale: 1.1 }] } : {}),
  },
  /* Dark overlay gradient */
  heroGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  /* Bottom fade so dots are readable */
  heroGradBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
  },
  /* Content row: poster left + info right */
  heroContentRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: isWeb ? 24 : 16,
    paddingBottom: 30,
  },
  /* Poster preview thumbnail */
  heroPosterWrap: {
    width: isWeb ? 140 : 100,
    height: isWeb ? 200 : 145,
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  heroPoster: {
    width: "100%",
    height: "100%",
  },
  /* Info panel next to poster */
  heroInfoPanel: {
    flex: 1,
    marginLeft: isWeb ? 20 : 14,
    justifyContent: "center",
  },
  heroLabel: {
    color: "#A8A8A8",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontFamily:"calibri",
    color: "#FFFFFF",
    fontSize: isWeb ? 22 : 17,
    fontWeight: "800",
    lineHeight: isWeb ? 28 : 23,
    marginBottom: 4,
  },
  heroEpisodeCount: {
    color: "#CCCCCC",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 6,
  },
  heroDescription: {
    color: "#999999",
    fontSize: isWeb ? 13 : 11,
    lineHeight: isWeb ? 18 : 16,
    marginBottom: 12,
  },
  heroMeta: {
    color: "#AAAAAA",
    fontSize: 12,
    marginBottom: 14,
  },
  heroBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 6,
  },
  heroBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  heroDot: {
    backgroundColor: "rgba(255,255,255,0.35)",
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  heroActiveDot: {
    width: 18,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },

  /* ─── GRID CARD (Epic Games style) ─── */
  dramaGrid: {
    marginHorizontal: 12,
    borderRadius: 12,
    marginBottom: 20,
    overflow: "hidden",
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
    justifyContent: "space-between",
  },
  card: {
    width: isWeb ? "23%" : "47%",
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  cardImageWrap: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: "#1A1A1A",
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  rankBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  rankText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
  },
  typeBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cardInfo: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardEpisode: {
    fontSize: 11,
    fontWeight: "500",
  },
  cardViews: {
    fontSize: 11,
    fontWeight: "700",
  },

  /* ─── EMPTY / RETRY ─── */
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
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
    marginBottom: 24,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  totalText: {
    fontSize: 12,
  },
});
