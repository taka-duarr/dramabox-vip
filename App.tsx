import React, { useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
  Text,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import HomeScreen from "./src/screens/HomeScreen";
import HomeScreen2 from "./src/screens/HomeScreen2";
import MyListScreen from "./src/screens/MyListScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import EpisodeScreen from "./src/screens/EpisodeScreen";
import EpisodeScreen2 from "./src/screens/EpisodeScreen2";
import VideoScreen from "./src/screens/VideoScreen";
import VideoScreen2 from "./src/screens/VideoScreen2";
import SearchScreen from "./src/screens/SearchScreen";
import SearchScreen2 from "./src/screens/SearchScreen2";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const { width } = Dimensions.get("window");

// Kustom Tab Bar dengan Animasi
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Animasi Scale
          const scaleValue = useRef(
            new Animated.Value(isFocused ? 1.2 : 1),
          ).current;

          useEffect(() => {
            Animated.spring(scaleValue, {
              toValue: isFocused ? 1.2 : 1, // Membesar sedikit saat aktif
              friction: 5,
              useNativeDriver: true,
            }).start();
          }, [isFocused]);

          // Memilih Ikon
          let iconSource;
          let iconSize = 22; // Kecilkan Home karena proporsi asli gambarnya dominan besar dan minim padding/margin transparan di dalamnya
          let iconName: any;
          let iconText;

          if (route.name === "HomeTab") {
            iconName = "server";
            iconText = "Server 1";
          } else if (route.name === "HomeScreen2") {
            iconName = "server";
            iconText = "Server 2";
          } else if (route.name === "MyListTab") {
            iconSource = require("./assets/bookmark.png");
            iconSize = 36; 
          } else if (route.name === "ProfileTab") {
            iconSource = require("./assets/profile.png");
            iconSize = 40; // Perbesar extra profile karena kanvasnya ternyata super kecil/jauh dari sisi margin
          }

          return (
            <TouchableOpacity
              key={index}
              onPress={onPress}
              activeOpacity={0.8}
              style={styles.tabItem}
            >
              <Animated.View
                style={[
                  styles.iconContainer,
                  { transform: [{ scale: scaleValue }] },
                ]}
              >
                {iconName ? (
                  <View style={{ alignItems: "center", justifyContent: "center" }}>
                    <Ionicons
                      name={isFocused ? iconName : `${iconName}-outline`}
                      size={24}
                      color={isFocused ? "#FF4757" : "#888888"}
                    />
                    <Text style={{ fontSize: 10, fontWeight: "600", color: isFocused ? "#FF4757" : "#888888", marginTop: 2 }}>{iconText}</Text>
                  </View>
                ) : (
                  <Image
                    source={iconSource}
                    style={[
                      styles.icon,
                      { 
                        tintColor: isFocused ? "#FF4757" : "#888888",
                        width: iconSize,
                        height: iconSize
                      },
                    ]}
                  />
                )}
              </Animated.View>
              {isFocused && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="HomeScreen2" component={HomeScreen2} />
      <Tab.Screen name="MyListTab" component={MyListScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="Search2" component={SearchScreen2} />
        <Stack.Screen name="Episode" component={EpisodeScreen} />
        <Stack.Screen name="Episode2" component={EpisodeScreen2} />
        <Stack.Screen name="Video" component={VideoScreen} />
        <Stack.Screen name="Video2" component={VideoScreen2} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    bottom: 20,
    width: width,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    width: "90%",
    height: 65,
    borderRadius: 35,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    // Efek Shadow melayang (Elevated)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    resizeMode: "contain",
  },
  activeIndicator: {
    width: 4,
    height: 4,
    backgroundColor: "#FF4757",
    borderRadius: 2,
    marginTop: 6,
    position: "absolute",
    bottom: -8, // Muncul di bawah ikon
  },
});
