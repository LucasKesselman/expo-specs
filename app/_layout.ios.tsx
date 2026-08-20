import { Stack } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";
import { GarmentNicknamesProvider } from "../contexts/GarmentNicknamesContext";
import { SelectedDigitalDesignProvider } from "../contexts/SelectedDigitalDesignContext";

export default function RootLayoutIOS() {
  return (
    <AuthProvider>
      <SelectedDigitalDesignProvider>
        <GarmentNicknamesProvider>
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
          <Stack.Screen
            name="link-garment"
            options={{
              headerShown: true,
              title: "Link Garment",
              headerStyle: { backgroundColor: "#111827" },
              headerTintColor: "#E5E7EB",
              headerTitleStyle: { fontWeight: "700" },
              presentation: "card",
            }}
          />
          </Stack>
        </GarmentNicknamesProvider>
      </SelectedDigitalDesignProvider>
    </AuthProvider>
  );
}
