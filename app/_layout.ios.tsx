import { Stack } from "expo-router";
import type { ComponentType, ReactNode } from "react";
import { Text, View } from "react-native";

// Development-build-first path:
// This file is intentionally iOS-native and expects an EAS development build.
function IOSHost({ children }: { children: ReactNode }) {
  try {
    const swiftUI = require("@expo/ui/swift-ui") as {
      Host: ComponentType<{ children?: ReactNode }>;
    };
    const Host = swiftUI.Host;
    return <Host>{children}</Host>;
  } catch {
    // iOS native Host is expected in development builds.
    // If this renders, the runtime likely does not support ExpoUI Host.
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ textAlign: "center" }}>
          iOS native Host is unavailable. Use an EAS development build for SDK 55 native UI testing.
        </Text>
      </View>
    );
  }
}

export default function RootLayoutIOS() {
  return (
    <IOSHost>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="digital-design/[designId]"
          options={{
            headerShown: true,
            title: "Digital Design",
            headerStyle: { backgroundColor: "#111827" },
            headerTintColor: "#E5E7EB",
            headerTitleStyle: { fontWeight: "700" },
            presentation: "card",
          }}
        />
      </Stack>
    </IOSHost>
  );
}
