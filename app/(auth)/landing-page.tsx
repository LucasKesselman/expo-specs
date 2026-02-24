import { Button, ButtonText } from "@/components/ui/button";
import { type Href, useRouter } from "expo-router";
import { Text, View } from "react-native";

export default function LandingPage() {
  const router = useRouter();

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
