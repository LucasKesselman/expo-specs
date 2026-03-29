import { Tabs } from "expo-router";
import { BottomTabBar, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

// Shared fallback tabs for non-iOS platforms.
// iOS-specific variant lives in: app/(tabs)/_layout.ios.tsx
function SelectedDigitalDesignAccessory() {
  return (
    <View style={selectedDigitalDesignAccessoryStyles.container}>
      <View style={selectedDigitalDesignAccessoryStyles.leftContent}>
        <Text style={selectedDigitalDesignAccessoryStyles.titleText}>
          Currently selected digital design:
        </Text>
        <Text style={selectedDigitalDesignAccessoryStyles.subtitleText}>
          placeholder design name
        </Text>
      </View>

      <View style={selectedDigitalDesignAccessoryStyles.imagePlaceholder}>
        <Text style={selectedDigitalDesignAccessoryStyles.imagePlaceholderText}>
          image
        </Text>
      </View>
    </View>
  );
}

function FallbackTabBarWithSelectedDigitalDesignAccessory(props: BottomTabBarProps) {
  return (
    <View style={fallbackTabBarStyles.container}>
      <BottomTabBar {...props} />

      <View pointerEvents="box-none" style={fallbackTabBarStyles.accessoryOverlay}>
        <SelectedDigitalDesignAccessory />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="camera"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "#111827" },
        tabBarStyle: { backgroundColor: "#111827" },
      }}
      tabBar={(props) => (
        <FallbackTabBarWithSelectedDigitalDesignAccessory {...props} />
      )}
    >
      <Tabs.Screen
        name="digital-marketplace"
        options={{
          title: "Digital Marketplace",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="image" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="physical-marketplace"
        options={{
          title: "Physical Marketplace",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shirt" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: "Camera",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="camera" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const selectedDigitalDesignAccessoryStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#030712",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 70,
  },
  leftContent: {
    flex: 1,
    paddingRight: 12,
  },
  titleText: {
    color: "#E5E7EB",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "left",
  },
  subtitleText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "left",
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    color: "#D1D5DB",
    fontSize: 11,
    fontWeight: "600",
  },
});

const fallbackTabBarStyles = StyleSheet.create({
  container: {
    position: "relative",
  },
  accessoryOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 64,
    pointerEvents: "box-none",
  },
});
