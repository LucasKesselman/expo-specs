import { Stack } from "expo-router";

// Shared fallback layout for non-iOS platforms.
// iOS-specific variant lives in: app/_layout.ios.tsx

export default function RootLayout() {
  return (
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
      <Stack.Screen
        name="create-physical-design"
        options={{
          headerShown: true,
          title: "Create Physical Design",
          headerStyle: { backgroundColor: "#111827" },
          headerTintColor: "#E5E7EB",
          headerTitleStyle: { fontWeight: "700" },
          presentation: "card",
        }}
      />
    </Stack>
  );
}
