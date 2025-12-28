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
import { Video, AVPlaybackStatus, ResizeMode } from "expo-av";




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
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [totalTime, setTotalTime] = useState("0:00");
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [durationMillis, setDurationMillis] = useState(0);
  const [positionMillis, setPositionMillis] = useState(0);

  const videoRef = useRef<Video>(null);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const progressBarRef = useRef<View>(null);

const currentVideo =
  currentEpisode.cdnList[0].videoPathList.find(
    (v) => v.quality === selectedQuality
  ) ?? currentEpisode.cdnList[0].videoPathList[0];

  // Format waktu
  const formatTime = (millis: number) => {
    if (!millis || millis < 0) return "0:00";
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // Fungsi untuk reset timer auto-hide
  const resetAutoHideTimer = () => {
    // Tampilkan controls
    setShowControls(true);

    // Clear timeout yang lama
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }

    // Set timeout baru untuk hide setelah 3 detik
    hideControlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  // Handler untuk update status video
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      // Update waktu saat ini
      const currentMillis = status.positionMillis;
      setPositionMillis(currentMillis);
      setCurrentTime(formatTime(currentMillis));

      // Update total durasi
      if (status.durationMillis) {
        setDurationMillis(status.durationMillis);
        setTotalTime(formatTime(status.durationMillis));

        // Update progress
        const progressValue = currentMillis / status.durationMillis;
        setProgress(progressValue);
      }

      // Update status play/pause
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        playNextEpisode();
      }
    }
  };

  // Toggle play/pause
  const togglePlayPause = async () => {
    const status = await videoRef.current?.getStatusAsync();
    if (status?.isLoaded) {
      if (status.isPlaying) {
        await videoRef.current?.pauseAsync();
        setIsPlaying(false);
      } else {
        await videoRef.current?.playAsync();
        setIsPlaying(true);
      }
      resetAutoHideTimer();
    }
  };

  // Handler untuk tap di progress bar
  const handleProgressBarTap = async (event: any) => {
    if (videoRef.current && progressBarRef.current && durationMillis > 0) {
      // Dapatkan posisi tap relatif terhadap progress bar
      progressBarRef.current.measure(
        (x, y, barWidth, barHeight, pageX, pageY) => {
          const tapX = event.nativeEvent.pageX - pageX;
          const progressPercentage = Math.max(0, Math.min(1, tapX / barWidth));

          const seekTime = progressPercentage * durationMillis;

          // Update UI
          setProgress(progressPercentage);
          setPositionMillis(seekTime);
          setCurrentTime(formatTime(seekTime));

          // Seek video
          videoRef.current?.setPositionAsync(seekTime);
          resetAutoHideTimer();
        }
      );
    }
  };
  const playNextEpisode = async () => {
    const currentIndex = episodes.findIndex(
      (ep) => ep.chapterId === currentEpisode.chapterId
    );

    // Kalau masih ada episode berikutnya
    if (currentIndex !== -1 && currentIndex < episodes.length - 1) {
      const nextEpisode = episodes[currentIndex + 1];

      setCurrentEpisode(nextEpisode);

      // Reset UI
      setProgress(0);
      setCurrentTime("0:00");
      setPositionMillis(0);
      setIsPlaying(true);

      // Reset video
      await videoRef.current?.setPositionAsync(0);
      await videoRef.current?.playAsync();

      resetAutoHideTimer();
    } else {
      // Episode terakhir
      setIsPlaying(false);
      setShowControls(true);
    }
  };


  // Handler untuk tap di layar
  const handleScreenTap = () => {
    // Jika controls sedang tidak ditampilkan, tampilkan dan set timer
    if (!showControls) {
      setShowControls(true);
      resetAutoHideTimer();
    } else {
      // Jika sudah ditampilkan, reset timer saja
      resetAutoHideTimer();
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

      {/* VIDEO FULLSCREEN */}
      <Video
        ref={videoRef}
        source={{ uri: currentVideo.videoPath }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
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
                    setProgress(0);
                    setCurrentTime("0:00");
                    setPositionMillis(0);
                    videoRef.current?.setPositionAsync(0);
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
                onPress={async () => {
                  setSelectedQuality(item.quality);
                  setShowQualityModal(false);

                  await videoRef.current?.setPositionAsync(positionMillis);
                  await videoRef.current?.playAsync();
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
    minWidth: 50,
    textAlign: "center",
    fontWeight: "500",
  },
  progressBarWrapper: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
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
