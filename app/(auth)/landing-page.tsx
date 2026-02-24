import { Button, ButtonText } from "@/components/ui/button";
import { useAuthState } from "@/hooks/useAuth";
import { type Href, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Alert, Text, View } from "react-native";

export default function LandingPage() {
  const router = useRouter();
  const user = useAuthState();
  const hasShownAlert = useRef(false);

  useEffect(() => {
    if (!user || hasShownAlert.current) return;
    hasShownAlert.current = true;
    Alert.alert(
      "Already logged in",
      "You are already logged in.",
      [{ text: "OK", onPress: () => router.replace("/(tabs)/account" as Href) }]
    );
  }, [user, router]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
      }}
    >
      <Text style={{ fontSize: 20, marginBottom: 8 }}>Landing</Text>
      <Button onPress={() => router.push("/(auth)/login" as Href)}>
        <ButtonText>Navigate to Login page</ButtonText>
      </Button>
      <Button
        variant="outline"
        action="secondary"
        onPress={() => router.replace("/(tabs)" as Href)}
      >
        <ButtonText>Bypass to Index Homepage</ButtonText>
      </Button>
    </View>
  );
}
