import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { RouteProp } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import { useKeepAwake } from "expo-keep-awake";
import { WebView } from "react-native-webview";

const { width, height } = Dimensions.get("window");

const VideoScreen2 = ({ route }: { route: RouteProp<any, any> }) => {
  useKeepAwake();
  const navigation = useNavigation();

  const { episode, episodes } = route.params as {
    episode: any;
    episodes: any[];
  };

  const [currentEpisode, setCurrentEpisode] = useState<any>(episode);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  // Custom Controls State
  const [isPlaying, setIsPlaying] = useState(true);
  const [positionMillis, setPositionMillis] = useState<number>(0);
  const [durationMillis, setDurationMillis] = useState<number>(0);

  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const progressBarRef = useRef<View>(null);
  const lastTapRef = useRef<number>(0);
  const webViewRef = useRef<WebView>(null);

  const currentVideoPath = currentEpisode.playVoucher ?? "";

  useEffect(() => {
    setIsLoading(true);
  }, [currentVideoPath]);

  // Fungsi untuk reset timer auto-hide
  const resetAutoHideTimer = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    hideControlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 4000); // 4 detik 
  };

  // Toggle play/pause - Inject JS to Video Tag
  const togglePlayPause = () => {
    if (isPlaying) {
      webViewRef.current?.injectJavaScript(`
        var v = document.getElementById('player');
        if (v) v.pause();
        true;
      `);
      setIsPlaying(false);
    } else {
      webViewRef.current?.injectJavaScript(`
        var v = document.getElementById('player');
        if (v) v.play();
        true;
      `);
      setIsPlaying(true);
    }
    resetAutoHideTimer();
  };

  const playNextEpisode = () => {
    const currentIndex = episodes.findIndex(
      (ep) => ep.episodeId === currentEpisode.episodeId
    );

    if (currentIndex !== -1 && currentIndex < episodes.length - 1) {
      const nextEpisode = episodes[currentIndex + 1];
      setCurrentEpisode(nextEpisode);
      setPositionMillis(0);
      setIsPlaying(true);
      resetAutoHideTimer();
    } else {
      setIsPlaying(false);
      setShowControls(true);
    }
  };

  // Handler untuk tap di progress bar
  const handleProgressBarTap = (event: any) => {
    if (progressBarRef.current && durationMillis > 0) {
      progressBarRef.current.measure(
        (x, y, barWidth, barHeight, pageX, pageY) => {
          const tapX = event.nativeEvent.pageX - pageX;
          const progressPercentage = Math.max(0, Math.min(1, tapX / barWidth));
          const seekTime = progressPercentage * (durationMillis / 1000); // dalam detik

          webViewRef.current?.injectJavaScript(`
            var v = document.getElementById('player');
            if (v) v.currentTime = ${seekTime};
            true;
          `);
          resetAutoHideTimer();
        }
      );
    }
  };

  // Handler tap di layar (Single Tap & Double Tap Seek)
  const handleScreenTap = (event: any) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    const tapX = event.nativeEvent.pageX;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // DOUBLE TAP
      if (tapX < width / 2) {
        // Mundur 10 detik
        webViewRef.current?.injectJavaScript(`
          var v = document.getElementById('player');
          if (v) v.currentTime = Math.max(0, v.currentTime - 10);
          true;
        `);
      } else {
        // Maju 10 detik
        webViewRef.current?.injectJavaScript(`
          var v = document.getElementById('player');
          if (v) v.currentTime = Math.min(v.duration, v.currentTime + 10);
          true;
        `);
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
    resetAutoHideTimer();
    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, []);

  const runFirst = `
    document.body.style.backgroundColor = 'black';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.display = 'flex';
    document.body.style.justifyContent = 'center';
    document.body.style.alignItems = 'center';
    document.body.style.height = '100vh';
    
    setTimeout(function() {
      var video = document.getElementsByTagName('video')[0];
      if (video) {
        video.play().catch(function(error) {
           console.log("Autoplay prevented:", error);
        });
      }
    }, 500);
    true;
  `;

  // Build `<track>` tags from episode's subtitleList
  const subtitles = currentEpisode.subtitleList || [];
  const tracksHtml = subtitles.map((sub: any, index: number) => {
    const isDefault = index === 0 ? "default" : "";
    return `<track label="${sub.subtitleLanguage}" kind="subtitles" srclang="${sub.subtitleLanguage}" src="${sub.url}" ${isDefault}>`;
  }).join("\n      ");

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        body { margin: 0; padding: 0; background-color: black; overflow: hidden; }
        /* Matikan kontrol native karena kita buat UI sendiri */
        video { width: 100vw; height: 100vh; object-fit: contain; }
        
        /* Gaya subtitle native */
        ::cue {
          background-color: rgba(0, 0, 0, 0.6);
          color: white;
          font-family: Arial, sans-serif;
          font-size: 5.5vw; /* Sedikit diperbesar */
          font-weight: bold; /* Dipertebal */
          line-height: 1.5;
        }

        /* Geser subtitle lebih ke atas (hampir ke tengah) */
        video::-webkit-media-text-track-display {
          padding-bottom: 25%; /* Pindah jauh ke atas */
        }

        video::cue {
          font-size: 5.5vw;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <video id="player" playsinline autoplay disablepictureinpicture controlslist="nodownload nofullscreen" style="pointer-events: none;" crossorigin="anonymous">
        <source src="${currentVideoPath}" type="video/mp4">
        ${tracksHtml}
      </video>
      <script>
        const video = document.getElementById('player');
        
        video.addEventListener('ended', () => {
           window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ended' }));
        });

        video.addEventListener('play', () => {
           window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'playback_state', isPlaying: true }));
        });

        video.addEventListener('pause', () => {
           window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'playback_state', isPlaying: false }));
        });

        // Kirim update waktu secara berkala
        setInterval(() => {
           if (video) {
             window.ReactNativeWebView.postMessage(JSON.stringify({
               type: 'progress',
               currentTime: Math.floor(video.currentTime * 1000),
               duration: Math.floor(video.duration * 1000) || 0
             }));
           }
        }, 500);
      </script>
    </body>
    </html>
  `;

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ended') {
        playNextEpisode();
      } else if (data.type === 'playback_state') {
        setIsPlaying(data.isPlaying);
      } else if (data.type === 'progress') {
        setPositionMillis(data.currentTime);
        setDurationMillis(data.duration);
      }
    } catch(e) {}
  };

  // Format waktu
  function formatTime(millis: number) {
    if (!millis || millis < 0 || isNaN(millis)) return "0:00";
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }

  const progress = durationMillis > 0 ? positionMillis / durationMillis : 0;
  const currentTime = formatTime(positionMillis);
  const totalTime = formatTime(durationMillis);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <View style={styles.webViewContainer}>
         {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FF4757" />
            </View>
         )}

        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          style={styles.video}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
          injectedJavaScript={runFirst}
          onMessage={onMessage}
          onLoadEnd={() => setIsLoading(false)}
          {...({ ignoreSslError: true } as any)} // Kunci bypass SSL CDN Netshort Server 2
          scrollEnabled={false}
          bounces={false}
        />

        {/* FULL SCREEN TOUCH AREA - untuk mendeteksi tap (single click, double click hide GUI overlay) */}
        <TouchableOpacity
          style={styles.fullScreenTouchable}
          activeOpacity={1}
          onPress={handleScreenTap}
          delayPressIn={0}
        >
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
              {!isPlaying && !isLoading && (
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

              {/* RIGHT SIDE BUTTONS (Episodes) */}
              <View style={styles.rightButtons}>
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
        </TouchableOpacity>
      </View>

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
              keyExtractor={(item) => item.episodeId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.episodeItem,
                    item.episodeId === currentEpisode.episodeId &&
                      styles.activeEpisode,
                  ]}
                  onPress={() => {
                    setCurrentEpisode(item);
                    setShowEpisodeList(false);
                    // Reset auto-play next episode 
                    setPositionMillis(0);
                    resetAutoHideTimer();
                  }}
                >
                  <Text style={styles.episodeText}>Episode {item.episodeNo}</Text>
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
    </View>
  );
};

export default VideoScreen2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: "black",
  },
  video: {
    flex: 1,
    width,
    height,
    backgroundColor: "black",
  },
  fullScreenTouchable: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 0,
  },
  /* TOP CONTROLS */
  topControls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    zIndex: 10,
  },
  backButton: {
    position: "absolute",
    left: 16,
    top: 45,
    padding: 8,
    zIndex: 15,
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
  /* PROGRESS BAR */
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
    fontVariant: ["tabular-nums"], 
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
    bottom: 200,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 8,
    zIndex: 10,
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
});
