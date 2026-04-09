import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Platform,
  PanResponder,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Ionicons } from "@expo/vector-icons";
import { RouteProp } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import { useKeepAwake } from "expo-keep-awake";
import { useTheme } from "../context/ThemeContext";

// WebView hanya tersedia di platform native (Android/iOS)
let WebView: any = null;
if (Platform.OS !== "web") {
  WebView = require("react-native-webview").WebView;
}

const { width, height } = Dimensions.get("window");

// ============================================================
// HTML untuk WebView/iframe — video polos TANPA kontrol HTML
// Menerima perintah via postMessage, mengirim state via postMessage
// ============================================================
function buildHtmlContent(videoUrl: string, tracksHtml: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%; height: 100%;
      background: black;
      overflow: hidden;
    }
    video {
      width: 100vw;
      height: 100vh;
      object-fit: contain;
      display: block;
    }
    /* Subtitle styling — proporsional & posisi lebih atas */
    ::cue {
      background-color: rgba(0,0,0,0.65);
      color: #fff;
      font-family: Arial, sans-serif;
      font-size: clamp(14px, 4.5vw, 22px);
      font-weight: 700;
      line-height: 1.4;
    }
    /* Geser subtitle agak ke bawah mendekati posisi asli tapi tetap di atas border bottom */
    video::-webkit-media-text-track-container {
      transform: translateY(-15%) !important;
    }
    video::cue {
      font-size: clamp(14px, 4.5vw, 22px);
      font-weight: 700;
    }
  </style>
</head>
<body>
  <video id="v" playsinline autoplay crossorigin="anonymous">
    <source src="${videoUrl}" type="video/mp4">
    ${tracksHtml}
  </video>
  <script>
    var v = document.getElementById('v');

    function send(obj) {
      var msg = JSON.stringify(obj);
      // Native WebView bridge
      try { window.ReactNativeWebView.postMessage(msg); } catch(e) {}
      // Web iframe bridge: kirim ke parent
      try { window.parent.postMessage(msg, '*'); } catch(e) {}
    }

    v.addEventListener('play',  function() { send({ type: 'play' }); });
    v.addEventListener('pause', function() { send({ type: 'pause' }); });
    v.addEventListener('ended', function() { send({ type: 'ended' }); });
    v.addEventListener('loadedmetadata', function() {
      send({ type: 'duration', value: v.duration || 0 });
    });
    v.addEventListener('timeupdate', function() {
      send({ type: 'timeupdate', currentTime: v.currentTime, duration: v.duration || 0 });
    });
    v.addEventListener('waiting', function()  { send({ type: 'loading', value: true }); });
    v.addEventListener('canplay', function()  { send({ type: 'loading', value: false }); });

    // Nyalakan subtitle
    v.addEventListener('loadeddata', function() {
      if (v.textTracks && v.textTracks.length > 0) {
        v.textTracks[0].mode = 'showing';
      }
    });

    // Terima perintah dari React Native (native: injectedJS, web: postMessage)
    function handleCommand(data) {
      if (!data || !data.cmd) return;
      if (data.cmd === 'play')   { v.play().catch(function(){}); }
      if (data.cmd === 'pause')  { v.pause(); }
      if (data.cmd === 'togglePlay') { if (v.paused) v.play().catch(function(){}); else v.pause(); }
      if (data.cmd === 'seek')   { v.currentTime = data.time || 0; }
      if (data.cmd === 'seekRel') {
        v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + (data.delta || 0)));
      }
    }

    // Untuk iframe di web
    window.addEventListener('message', function(e) {
      try { handleCommand(JSON.parse(e.data)); } catch(ex) {}
    });

    // Expose global untuk injectJavaScript di native
    window.videoCommand = handleCommand;

    // Keyboard shortcuts (berjalan di web / iframe)
    document.addEventListener('keydown', function(e) {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (v.paused) { v.play().catch(function(){}); } else { v.pause(); }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        v.currentTime = Math.min(v.duration || 0, v.currentTime + 10);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        v.currentTime = Math.max(0, v.currentTime - 10);
      }
    });

    // Autoplay
    v.play().catch(function(){});
  </script>
</body>
</html>`;
}

// ============================================================
// KOMPONEN UTAMA
// ============================================================
const VideoScreen2 = ({ route }: { route: RouteProp<any, any> }) => {
  useKeepAwake();
  const navigation = useNavigation();
  const { colors } = useTheme();

  const { episode, episodes } = route.params as {
    episode: any;
    episodes: any[];
  };

  // ---- STATE ----
  const [currentEpisode, setCurrentEpisode] = useState<any>(episode);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [positionMillis, setPositionMillis] = useState(0); // in seconds
  const [durationMillis, setDurationMillis] = useState(0); // in seconds

  // ---- REFS ----
  const webViewRef = useRef<any>(null);
  const iframeRef = useRef<any>(null);
  const progressBarRef = useRef<View>(null);
  const lastTapRef = useRef<number>(0);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  const currentVideoPath = currentEpisode.playVoucher ?? "";
  const subtitles = currentEpisode.subtitleList || [];
  const tracksHtml = subtitles
    .map(
      (sub: any, i: number) =>
        `<track label="${sub.subtitleLanguage}" kind="subtitles" srclang="${sub.subtitleLanguage}" src="${sub.url}" ${i === 0 ? "default" : ""}>`
    )
    .join("\n    ");

  const htmlContent = buildHtmlContent(currentVideoPath, tracksHtml);

  // ---- AUTO-HIDE CONTROLS ----
  const resetAutoHide = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  useEffect(() => {
    resetAutoHide();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  // Reset saat episode ganti
  useEffect(() => {
    setIsLoading(true);
    setIsPlaying(true);
    setPositionMillis(0);
    setDurationMillis(0);
    resetAutoHide();
  }, [currentVideoPath]);

  // Auto-hide saat play
  useEffect(() => {
    if (isPlaying && showControls) resetAutoHide();
  }, [isPlaying, showControls]);

  // ---- COMMAND SYSTEM ----
  const sendCommand = useCallback((cmd: object) => {
    const msg = JSON.stringify(cmd);
    if (Platform.OS === "web") {
      try {
        iframeRef.current?.contentWindow?.postMessage(msg, "*");
      } catch (_) {}
    } else {
      try {
        webViewRef.current?.injectJavaScript(`window.videoCommand && window.videoCommand(${msg}); true;`);
      } catch (_) {}
    }
  }, []);

  // ---- WEB: setup iframe postMessage listener & global keyboard shortcuts ----

  useEffect(() => {
    if (Platform.OS !== "web") return;

    // Listener dari iframe
    const messageHandler = (e: MessageEvent) => {
      try {
        const data = JSON.parse(typeof e.data === "string" ? e.data : JSON.stringify(e.data));
        handleVideoMessage(data);
      } catch (_) {}
    };
    window.addEventListener("message", messageHandler);

    // Global keyboard listener (jika focus ada di parent / UI React Native)
    const keyHandler = (e: KeyboardEvent) => {
      // Abaikan jika mengetik di dalam input box
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        sendCommand({ cmd: "togglePlay" });
        resetAutoHide();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        sendCommand({ cmd: "seekRel", delta: 10 });
        resetAutoHide();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        sendCommand({ cmd: "seekRel", delta: -10 });
        resetAutoHide();
      }
    };
    window.addEventListener("keydown", keyHandler);

    return () => {
      window.removeEventListener("message", messageHandler);
      window.removeEventListener("keydown", keyHandler);
    };
  }, [currentEpisode, sendCommand, resetAutoHide]);

  // ---- VIDEO EVENT HANDLER ----
  function handleVideoMessage(data: any) {
    if (!data || !data.type) return;
    if (data.type === "play")    { setIsPlaying(true); }
    if (data.type === "pause")   { setIsPlaying(false); }
    if (data.type === "loading") { setIsLoading(data.value); }
    if (data.type === "ended")   { playNextEpisode(); }
    if (data.type === "timeupdate") {
      setPositionMillis(data.currentTime);
      setDurationMillis(data.duration);
      if (data.duration > 0 && data.currentTime >= data.duration - 0.5) {
        playNextEpisode();
      }
    }
  }

  // ---- onMessage handler (native WebView) ----
  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      handleVideoMessage(data);
    } catch (_) {}
  };

  // ---- PLAY/PAUSE ----
  const togglePlayPause = () => {
    if (isPlaying) {
      sendCommand({ cmd: "pause" });
      setIsPlaying(false);
    } else {
      sendCommand({ cmd: "play" });
      setIsPlaying(true);
    }
    resetAutoHide();
  };

  // ---- SEEK ----
  const seekRelative = (delta: number) => {
    sendCommand({ cmd: "seekRel", delta });
    resetAutoHide();
  };

  const handleProgressBarTap = (event: any) => {
    if (progressBarRef.current && durationMillis > 0) {
      progressBarRef.current.measure(
        (_x: number, _y: number, barWidth: number, _bh: number, pageX: number) => {
          const tapX = event.nativeEvent.pageX - pageX;
          const pct = Math.max(0, Math.min(1, tapX / barWidth));
          const seekTime = pct * durationMillis;
          sendCommand({ cmd: "seek", time: seekTime });
          setPositionMillis(seekTime);
          resetAutoHide();
        }
      );
    }
  };

  // ---- NEXT EPISODE ----
  const playNextEpisode = () => {
    const idx = episodes.findIndex((ep) => ep.episodeId === currentEpisode.episodeId);
    if (idx !== -1 && idx < episodes.length - 1) {
      setCurrentEpisode(episodes[idx + 1]);
      setPositionMillis(0);
      resetAutoHide();
    } else {
      sendCommand({ cmd: "pause" });
      setIsPlaying(false);
      setShowControls(true);
    }
  };

  // ---- PREV EPISODE ----
  const playPreviousEpisode = () => {
    const idx = episodes.findIndex((ep) => ep.episodeId === currentEpisode.episodeId);
    if (idx > 0) {
      setCurrentEpisode(episodes[idx - 1]);
      setPositionMillis(0);
      resetAutoHide();
    }
  };

  // TikTok-style Swipe Gesture (Up = Next, Down = Prev)
  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Hanya respons jika swipe vertikal cukup kuat (mencegah klik biasa tertangkap)
        return Math.abs(gestureState.dy) > 30 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 2;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy < -60) {
          // Swipe Naik -> Episode Selanjutnya
          playNextEpisode();
        } else if (gestureState.dy > 60) {
          // Swipe Turun -> Episode Sebelumnya
          playPreviousEpisode();
        }
      },
    }),
    [currentEpisode]
  );

  // ---- SCREEN TAP (single = toggle controls, double = seek) ----
  const handleScreenTap = (event: any) => {
    const now = Date.now();
    const tapX = event.nativeEvent.pageX;

    if (now - lastTapRef.current < 300) {
      // Double tap
      seekRelative(tapX < width / 2 ? -10 : 10);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      if (!showControls) {
        resetAutoHide();
      } else {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        setShowControls(false);
      }
    }
  };

  // ---- HELPERS ----
  const progress = durationMillis > 0 ? positionMillis / durationMillis : 0;

  function formatTime(secs: number) {
    if (!secs || isNaN(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  const currentTime = formatTime(positionMillis);
  const totalTime = formatTime(durationMillis);

  // ======================================
  // RENDER
  // ======================================
  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* VIDEO PLAYER */}
      {Platform.OS === "web" ? (
        <iframe
          ref={iframeRef}
          srcDoc={htmlContent}
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            width: "100%",
            height: "100%",
            border: "none",
            backgroundColor: "black",
          } as any}
          allow="autoplay; fullscreen"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
        />
      ) : (
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          style={styles.video}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          onMessage={onMessage}
          onLoadEnd={() => setIsLoading(false)}
          scrollEnabled={false}
          bounces={false}
          {...({ ignoreSslError: true } as any)}
        />
      )}

      {/* LOADING OVERLAY */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF4757" />
          <Text style={styles.bufferingText}>Memuat Video...</Text>
        </View>
      )}

      {/* TIKTOK SWIPE GESTURE WRAPPER */}
      <View style={[StyleSheet.absoluteFillObject, { zIndex: 10 }]} {...panResponder.panHandlers}>
        {/* FULL SCREEN TOUCH AREA — deteksi tap, di atas video */}
        <TouchableOpacity
          style={styles.fullScreenTouchable}
          activeOpacity={1}
          onPress={handleScreenTap}
          delayPressIn={0}
        >
          {showControls && (
          <>
            {/* TOP CONTROLS */}
            <View style={styles.topControls}>
              <Text style={styles.episodeTitle} numberOfLines={1}>
                {currentEpisode.chapterName}
              </Text>
              <TouchableOpacity
                style={styles.closePageButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
            </View>

            {/* CENTER PLAY BUTTON — muncul saat pause */}
            {!isPlaying && (
              <TouchableOpacity
                style={styles.centerPlayButton}
                onPress={togglePlayPause}
                activeOpacity={0.8}
              >
                <View style={styles.playButtonCircle}>
                  <Ionicons name="play" size={60} color="rgba(255,255,255,0.9)" />
                </View>
              </TouchableOpacity>
            )}

            {/* BOTTOM GRADIENT OVERLAY */}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.85)"]}
              style={styles.bottomOverlay}
            >
              {/* PROGRESS BAR + WAKTU */}
              <View style={styles.progressContainer}>
                <Text style={styles.timeText}>{currentTime}</Text>
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
                          { width: `${progress * 100}%` as any, backgroundColor: colors.accent },
                        ]}
                      />
                      <View
                        style={[
                          styles.progressThumb,
                          { left: `${progress * 100}%` as any, backgroundColor: colors.accent },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
                <Text style={styles.timeText}>{totalTime}</Text>
              </View>

              {/* BOTTOM CONTROLS: -10s | Play/Pause | +10s */}
              <View style={styles.bottomControls}>
                <TouchableOpacity style={styles.controlButton} onPress={() => seekRelative(-10)}>
                  <Ionicons name="play-back" size={28} color="white" />
                  <Text style={styles.controlButtonText}>-10s</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.controlButton} onPress={togglePlayPause}>
                  <Ionicons name={isPlaying ? "pause" : "play"} size={28} color="white" />
                  <Text style={styles.controlButtonText}>{isPlaying ? "Pause" : "Play"}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.controlButton} onPress={() => seekRelative(10)}>
                  <Ionicons name="play-forward" size={28} color="white" />
                  <Text style={styles.controlButtonText}>+10s</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </>
        )}

        {/* RIGHT SIDE BUTTONS */}
        {showControls && (
          <View style={styles.rightButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                setShowEpisodeList(true);
                resetAutoHide();
              }}
            >
              <Ionicons name="list" size={30} color="white" />
              <Text style={styles.iconText}>EP</Text>
            </TouchableOpacity>
          </View>
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
          resetAutoHide();
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              setShowEpisodeList(false);
              resetAutoHide();
            }}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.bg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Daftar Episode</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEpisodeList(false);
                  resetAutoHide();
                }}
                style={styles.modalCloseIcon}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={episodes}
              keyExtractor={(item) => item.episodeId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.episodeItem,
                    {
                      backgroundColor:
                        item.episodeId === currentEpisode.episodeId
                          ? colors.accent
                          : colors.card,
                    },
                  ]}
                  onPress={() => {
                    setCurrentEpisode(item);
                    setShowEpisodeList(false);
                    resetAutoHide();
                  }}
                >
                  <Text
                    style={[
                      styles.episodeText,
                      {
                        color:
                          item.episodeId === currentEpisode.episodeId
                            ? "#FFFFFF"
                            : colors.text,
                      },
                    ]}
                  >
                    Episode {item.episodeNo}
                  </Text>
                </TouchableOpacity>
              )}
            />
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
  video: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    flex: 1,
    backgroundColor: "black",
  },
  fullScreenTouchable: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  bufferingText: {
    color: "white",
    marginTop: 10,
    fontSize: 14,
    opacity: 0.8,
  },
  /* TOP CONTROLS */
  topControls: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  episodeTitle: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    marginRight: 12,
  },
  closePageButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
  },
  /* CENTER PLAY */
  centerPlayButton: {
    position: "absolute",
    top: height / 2 - 60,
    alignSelf: "center",
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
  /* BOTTOM GRADIENT CONTAINER */
  bottomOverlay: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    paddingTop: 60,
    paddingBottom: 20,
    zIndex: 5,
  },
  /* PROGRESS BAR */
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  timeText: {
    color: "white",
    fontSize: 13,
    minWidth: 42,
    textAlign: "center",
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  progressBarWrapper: {
    flex: 1,
    height: 36,
    marginHorizontal: 12,
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
    marginLeft: -8,
  },
  /* BOTTOM CONTROLS */
  bottomControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  controlButton: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 6,
  },
  controlButtonText: {
    color: "white",
    fontSize: 11,
    marginTop: 4,
    fontWeight: "500",
  },
  /* RIGHT BUTTONS */
  rightButtons: {
    position: "absolute",
    right: 16,
    bottom: 210,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  iconButton: {
    alignItems: "center",
    marginVertical: 8,
    paddingHorizontal: 8,
  },
  iconText: {
    color: "white",
    fontSize: 11,
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    elevation: 10,
  },
  absoluteFill: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalCloseIcon: {
    padding: 4,
  },
  episodeItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  episodeText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
