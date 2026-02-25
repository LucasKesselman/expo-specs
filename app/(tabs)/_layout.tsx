import Ionicons from "@expo/vector-icons/Ionicons";
import { useThemeColors } from "@/hooks/useThemeColors";
import * as Haptics from "expo-haptics";
import { Tabs } from "expo-router";
import { Platform, Pressable } from "react-native";

/** Light haptic when a tab bar button is pressed. */
function HapticTabButton(
  props: React.PropsWithChildren<{ onPress?: (e: unknown) => void; [k: string]: unknown }>
) {
  const { children, onPress, ...rest } = props;
  const handlePress = (e: unknown) => {
    if (Platform.OS === "ios" || Platform.OS === "android") {
      Haptics.selectionAsync();
    }
    onPress?.(e);
  };
  return (
    <Pressable onPress={handlePress} {...(rest as React.ComponentProps<typeof Pressable>)}>
      {children}
    </Pressable>
  );
}

/** Tabs layout: Marketplace, Camera, Account with theme-aware tab bar colors. */
export default function TabsLayout() {
  const colors = useThemeColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary500,
        tabBarInactiveTintColor: colors.typography500,
        tabBarStyle: {
          backgroundColor: colors.secondary0,
          borderTopColor: colors.outline200,
        },
        tabBarButton: (props) => <HapticTabButton {...(props as React.ComponentProps<typeof HapticTabButton>)} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: "Marketplace",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="camera-page"
        options={{
          title: "Camera",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="camera" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
