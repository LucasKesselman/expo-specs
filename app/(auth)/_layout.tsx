import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#111827" },
        headerTintColor: "#E5E7EB",
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: "#111827" },
      }}
    >
      <Stack.Screen name="landing" options={{ title: "Account Access" }} />
      <Stack.Screen name="login" options={{ title: "Log In" }} />
      <Stack.Screen name="signup" options={{ title: "Sign Up" }} />
    </Stack>
  );
}
