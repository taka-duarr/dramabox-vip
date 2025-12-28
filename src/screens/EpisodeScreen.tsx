import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { getAllEpisodes } from "../services/api";
import { Episode } from "../types/episode";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";




const EpisodeScreen = ({ route, navigation }: any) => {
  const { bookId, title } = route.params ?? {};
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookId) return;
    loadEpisodes();
  }, [bookId]);

  const loadEpisodes = async () => {
    try {
      console.log("FETCH EPISODE FOR:", bookId);
      const data = await getAllEpisodes(bookId);
      console.log("EPISODES:", data.length);
      setEpisodes(data);
    } catch (e) {
      console.error("FETCH ERROR:", e);
    } finally {
      setLoading(false);
    }
  };

return (
  <SafeAreaView style={styles.container}>
    <StatusBar style="light" backgroundColor="#0F172A" />

    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>

      {/* spacer agar title tetap center */}
      <View style={{ width: 40 }} />
    </View>

    {loading ? (
      <Text style={{ color: "white", textAlign: "center" }}>
        Loading episode...
      </Text>
    ) : (
      <FlatList
        data={episodes}
        keyExtractor={(item) => item.chapterId}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate("Video", {
                episode: item,
                episodes,
              })
            }
          >
            <Image source={{ uri: item.chapterImg }} style={styles.image} />
            <Text style={styles.text}>{item.chapterName}</Text>
          </TouchableOpacity>
        )}
      />
    )}
  </SafeAreaView>
);


};

export default EpisodeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000ff",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "#000000ff",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#25282eff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  image: {
    width: 120,
    height: 70,
    borderRadius: 8,
    marginRight: 10,
  },
  text: {
    color: "white",
    fontSize: 16,
  },
  headerTitle: {
    flex: 1,
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
