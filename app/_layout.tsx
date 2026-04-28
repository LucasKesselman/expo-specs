import { Stack } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";
import { SelectedDigitalDesignProvider } from "../contexts/SelectedDigitalDesignContext";

// Shared fallback layout for non-iOS platforms.
// iOS-specific variant lives in: app/_layout.ios.tsx

export default function RootLayout() {
  return (
    <AuthProvider>
      <SelectedDigitalDesignProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
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
            name="physical-design/[designId]"
            options={{
              headerShown: true,
              title: "Physical Design",
              headerStyle: { backgroundColor: "#111827" },
              headerTintColor: "#E5E7EB",
              headerTitleStyle: { fontWeight: "700" },
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="garment/[garmentId]"
            options={{
              headerShown: true,
              title: "Garment",
              headerStyle: { backgroundColor: "#111827" },
              headerTintColor: "#E5E7EB",
              headerTitleStyle: { fontWeight: "700" },
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="physical-cart"
            options={{
              headerShown: true,
              title: "Checkout",
              headerStyle: { backgroundColor: "#111827" },
              headerTintColor: "#E5E7EB",
              headerTitleStyle: { fontWeight: "700" },
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="create-digital-design"
            options={{
              headerShown: true,
              title: "Create Digital Design",
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
      </SelectedDigitalDesignProvider>
    </AuthProvider>
  );
}
