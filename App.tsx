import React, { useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import HomeScreen from "./src/screens/HomeScreen";
import ExploreScreen from "./src/screens/ExploreScreen";
import MyListScreen from "./src/screens/MyListScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import EpisodeScreen from "./src/screens/EpisodeScreen";
import VideoScreen from "./src/screens/VideoScreen";
import SearchScreen from "./src/screens/SearchScreen";

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

          if (route.name === "HomeTab") {
            iconSource = require("./assets/home.png");
            iconSize = 22;
          } else if (route.name === "ExploreTab") {
            iconSource = require("./assets/explore.png");
            iconSize = 36; // Perbesar agar seimbang dengan Home
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
      <Tab.Screen name="ExploreTab" component={ExploreScreen} />
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
        <Stack.Screen name="Episode" component={EpisodeScreen} />
        <Stack.Screen name="Video" component={VideoScreen} />
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
