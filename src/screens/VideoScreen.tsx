import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { RouteProp } from "@react-navigation/native";
import { Episode } from "../types/episode";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import { useKeepAwake } from "expo-keep-awake";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";




const { width, height } = Dimensions.get("window");

const VideoScreen = ({ route }: { route: RouteProp<any, any> }) => {
  useKeepAwake();
  const navigation = useNavigation();

  const { episode, episodes } = route.params as {
    episode: Episode;
    episodes: Episode[];
  };
const [selectedQuality, setSelectedQuality] = useState<number>(720);
const [showQualityModal, setShowQualityModal] = useState(false);

  const [currentEpisode, setCurrentEpisode] = useState<Episode>(episode);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);

  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const progressBarRef = useRef<View>(null);
  const lastTapRef = useRef<number>(0);

  const currentVideo =
    currentEpisode.cdnList[0].videoPathList.find(
      (v) => v.quality === selectedQuality
    ) ?? currentEpisode.cdnList[0].videoPathList[0];

  // Inisialisasi Player Video Modern tanpa Rerender Ulang Objek
  const player = useVideoPlayer(currentVideo.videoPath, (player) => {
    player.loop = false;
    player.muted = false;
    player.volume = 1.0;
    player.play();
  });

  // Saat kualitas berubah atau episode beda, gunakan replace() agar Native Object tidak hancur
  useEffect(() => {
    const backupPos = player.currentTime; // Simpan durasi terakhir sebelum ditarik
    player.replace(currentVideo.videoPath); // Secara ajaib load Source tanpa membunuh Player
    
    // Geser instan kembali ke menit terakhir secara aman
    if (backupPos > 0) {
       player.currentTime = backupPos;
    }
    
    // Paksa nyalakan ulang suara yang kerap direset oleh modul Native pasca Replace!
    player.muted = false;
    player.volume = 1.0;

    player.play();
  }, [currentVideo.videoPath]);

  // Event Listener Real-Time tanpa Lag/Buffering berat (expo terbaru)
  const { isPlaying: playerIsPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  
  // Karena hook event native tidak me-Rerender State UI setiap detik (hanya trigger under-the-hood expo)
  // Kita hubungkan ke State lokal dengan interval saat video Play
  const [positionMillis, setPositionMillis] = useState<number>(0);
  const [durationMillis, setDurationMillis] = useState<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setPositionMillis(player.currentTime);
        setDurationMillis(player.duration || 0);
      }, 500); // UI Rerender setiap 500ms agar bar maju mulus
    }
    return () => clearInterval(interval);
  }, [isPlaying, player]);
  
  // Hitung persentase progress
  const progress = durationMillis > 0 ? positionMillis / durationMillis : 0;
  const currentTime = formatTime(positionMillis * 1000); // fungsi kita butuh hitungan ms
  const totalTime = formatTime(durationMillis * 1000);

  // Status sinkron PlayPause ke state lokal
  useEffect(() => {
    setIsPlaying(playerIsPlaying);
  }, [playerIsPlaying]);

  // Efek ganti episode saat duration mentok selesai (End of video)
  useEffect(() => {
    if (durationMillis > 0 && positionMillis >= durationMillis - 0.5) { // toleransi milisekon kecil
        playNextEpisode();
    }
  }, [positionMillis, durationMillis]);

  // Format waktu
  function formatTime(millis: number) {
    if (!millis || millis < 0) return "0:00";
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }

  // Fungsi untuk reset timer auto-hide
  const resetAutoHideTimer = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    hideControlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 4000); // 4 detik 
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (playerIsPlaying) {
      player.pause();
    } else {
      player.play();
    }
    resetAutoHideTimer();
  };

  // Handler untuk tap di progress bar
  const handleProgressBarTap = (event: any) => {
    if (progressBarRef.current && durationMillis > 0) {
      progressBarRef.current.measure(
        (x, y, barWidth, barHeight, pageX, pageY) => {
          const tapX = event.nativeEvent.pageX - pageX;
          const progressPercentage = Math.max(0, Math.min(1, tapX / barWidth));
          const seekTime = progressPercentage * durationMillis; // hitungan satuan second (s)

          // Seek video instan dari modul modern
          player.currentTime = seekTime;
          resetAutoHideTimer();
        }
      );
    }
  };

  const playNextEpisode = () => {
    const currentIndex = episodes.findIndex(
      (ep) => ep.chapterId === currentEpisode.chapterId
    );

    // Kalau masih ada episode berikutnya
    if (currentIndex !== -1 && currentIndex < episodes.length - 1) {
      const nextEpisode = episodes[currentIndex + 1];

      setCurrentEpisode(nextEpisode);

      // Reset auto-play next episode (player will reactive immediately due to mount effect)
      setPositionMillis(0);
      resetAutoHideTimer();
    } else {
      // Episode terakhir
      player.pause();
      setShowControls(true);
    }
  };


  // Handler untuk tap di layar (Single Tap & Double Tap Seek)
  const handleScreenTap = (event: any) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    const tapX = event.nativeEvent.pageX;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // DOUBLE TAP: Cek sisi mana layar ditekan
      if (tapX < width / 2) {
        // Sisi Kiri -> Mundur 10 detik
        player.currentTime = Math.max(0, player.currentTime - 10);
      } else {
        // Sisi Kanan -> Maju 10 detik
        const dest = player.currentTime + 10;
        player.currentTime = (durationMillis > 0 && dest > durationMillis) ? durationMillis : dest;
      }
      lastTapRef.current = 0; // reset hitungan
      setShowControls(true);
      resetAutoHideTimer();
    } else {
      // SINGLE TAP
      lastTapRef.current = now;
      if (!showControls) {
        setShowControls(true);
        resetAutoHideTimer();
      } else {
        setShowControls(false);
      }
    }
  };

  // Cleanup timeout saat komponen unmount
  useEffect(() => {
    // Set timeout awal saat komponen mount
    resetAutoHideTimer();

    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, []);

  // Auto-hide ketika video sedang diputar
  useEffect(() => {
    if (isPlaying && showControls) {
      resetAutoHideTimer();
    }
  }, [isPlaying, showControls]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* NATIVE VIDEO KINERJA TINGGI DARI EXPO-VIDEO */}
      <VideoView
        style={styles.video}
        player={player}
        nativeControls={false}
        allowsFullscreen={false} // Atur true jika Anda butuh modal fullscreen native (fitur OS)
        allowsPictureInPicture={false}
        contentFit="contain"
      />

      {/* FULL SCREEN TOUCH AREA - untuk mendeteksi tap */}
      <TouchableOpacity
        style={styles.fullScreenTouchable}
        activeOpacity={1}
        onPress={handleScreenTap}
        delayPressIn={0}
      >
        {/* OVERLAY KONTROL - hanya muncul jika showControls true */}
        {showControls && (
          <>
            {/* TOP CONTROLS - Judul Episode */}
            <View style={styles.topControls}>
              {/* BACK BUTTON */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={26} color="white" />
              </TouchableOpacity>

              {/* TITLE */}
              <Text style={styles.episodeTitle} numberOfLines={1}>
                {currentEpisode.chapterName}
              </Text>
            </View>

            {/* PLAY/PAUSE BUTTON DI TENGAH - hanya muncul saat pause */}
            {!isPlaying && (
              <TouchableOpacity
                style={styles.centerPlayButton}
                onPress={togglePlayPause}
                activeOpacity={0.8}
              >
                <View style={styles.playButtonCircle}>
                  <Ionicons
                    name="play"
                    size={60}
                    color="rgba(255,255,255,0.9)"
                  />
                </View>
              </TouchableOpacity>
            )}

            {/* PROGRESS BAR DAN WAKTU DI BAWAH */}
            <View style={styles.progressContainer}>
              {/* Waktu saat ini */}
              <Text style={styles.timeText}>{currentTime}</Text>

              {/* Progress Bar Container */}
              <View ref={progressBarRef} style={styles.progressBarWrapper}>
                <TouchableOpacity
                  style={styles.progressBarTouchable}
                  activeOpacity={1}
                  onPress={handleProgressBarTap}
                >
                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${progress * 100}%` },
                      ]}
                    />
                    <View
                      style={[
                        styles.progressThumb,
                        {
                          left: `${progress * 100}%`,
                        },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Total waktu */}
              <Text style={styles.timeText}>{totalTime}</Text>
            </View>

            {/* BOTTOM CONTROL BUTTONS */}
            <View style={styles.bottomControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={togglePlayPause}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={28}
                  color="white"
                />
                <Text style={styles.controlButtonText}>
                  {isPlaying ? "Pause" : "Play"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* RIGHT SIDE BUTTONS */}
        {showControls && (
          <View style={styles.rightButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                setShowQualityModal(true);
                resetAutoHideTimer();
              }}
            >
              <Ionicons name="settings" size={28} color="white" />
              <Text style={styles.iconText}>{selectedQuality}p</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                setShowEpisodeList(true);
                resetAutoHideTimer();
              }}
            >
              <Ionicons name="list" size={30} color="white" />
              <Text style={styles.iconText}>EP</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>

      {/* EPISODE MODAL */}
      <Modal
        visible={showEpisodeList}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowEpisodeList(false);
          resetAutoHideTimer();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Daftar Episode</Text>

            <FlatList
              data={episodes}
              keyExtractor={(item) => item.chapterId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.episodeItem,
                    item.chapterId === currentEpisode.chapterId &&
                      styles.activeEpisode,
                  ]}
                  onPress={() => {
                    setCurrentEpisode(item);
                    setShowEpisodeList(false);
                    resetAutoHideTimer();
                  }}
                >
                  <Text style={styles.episodeText}>{item.chapterName}</Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowEpisodeList(false);
                resetAutoHideTimer();
              }}
            >
              <Text style={styles.closeButtonText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showQualityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQualityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qualityModal}>
            <Text style={styles.modalTitle}>Pilih Kualitas</Text>

            {currentEpisode.cdnList[0].videoPathList.map((item) => (
              <TouchableOpacity
                key={item.quality}
                style={[
                  styles.qualityItem,
                  item.quality === selectedQuality && styles.activeQuality,
                ]}
                  onPress={() => {
                  setSelectedQuality(item.quality);
                  setShowQualityModal(false);
                  // LOGIC SEEK DELAY TELAH DIPINDAHKAN KE DALAM useEffect AMAN DI ATAS
                }}
              >
                <Text style={styles.qualityText}>{item.quality}p</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default VideoScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  video: {
    width,
    height,
  },
  fullScreenTouchable: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  /* TOP CONTROLS */
  topControls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50, // aman untuk notch
    paddingBottom: 15,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
  },

  episodeTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },

  /* CENTER PLAY BUTTON */
  centerPlayButton: {
    position: "absolute",
    top: height / 2 - 60,
    alignSelf: "center",
    zIndex: 10,
  },
  playButtonCircle: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 60,
    padding: 20,
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },

  /* PROGRESS BAR - FIXED */
  progressContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 20,
  },
  timeText: {
    color: "white",
    fontSize: 14,
    minWidth: 45,
    textAlign: "center",
    fontWeight: "600",
    fontVariant: ["tabular-nums"], // Bikin angka-angka tidak bergeser tebal/tipisnya
  },
  progressBarWrapper: {
    flex: 1,
    height: 40,
    marginHorizontal: 15,
    justifyContent: "center",
  },
  progressBarTouchable: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
  },
  progressBarBackground: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    position: "relative",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#ff0a0aff",
    borderRadius: 2,
    position: "absolute",
    left: 0,
    top: 0,
  },
  progressThumb: {
    position: "absolute",
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ff0000ff",
    marginLeft: -8,
  },

  /* BOTTOM CONTROLS */
  bottomControls: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 15,
  },
  controlButton: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  controlButtonText: {
    color: "white",
    fontSize: 12,
    marginTop: 5,
    fontWeight: "500",
  },

  /* RIGHT BUTTONS */
  rightButtons: {
    position: "absolute",
    right: 16,
    bottom: 180,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  iconButton: {
    alignItems: "center",
    marginVertical: 10,
    paddingHorizontal: 8,
  },
  iconText: {
    color: "white",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    height: "60%",
    backgroundColor: "#111827",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  modalTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  episodeItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#1F2937",
    marginBottom: 10,
  },
  activeEpisode: {
    backgroundColor: "#f90a0aff",
  },
  episodeText: {
    color: "white",
    fontSize: 15,
  },
  closeButton: {
    alignSelf: "center",
    marginTop: 15,
    paddingVertical: 12,
    paddingHorizontal: 40,
    backgroundColor: "#ff0000ff",
    borderRadius: 8,
  },
  closeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    position: "absolute",
    left: 16,
    padding: 8,
    zIndex: 10,
  },

  qualityModal: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 16,
    width: "80%",
  },

  qualityItem: {
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#1F2937",
  },

  activeQuality: {
    backgroundColor: "#ff0000ff",
  },

  qualityText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
