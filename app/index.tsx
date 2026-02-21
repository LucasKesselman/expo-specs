import { Button, ButtonText } from "@/components/ui/button";
import { type Href, useRouter } from "expo-router";
import { Text, View } from "react-native";

export default function Index() {
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
      <Text>Edit app/index.tsx to edit this screen.</Text>
      <Button onPress={() => router.push("/user-auth-page" as Href)}>
        <ButtonText>User Auth Page</ButtonText>
      </Button>
      <Button onPress={() => router.push("/user-account-page" as Href)}>
        <ButtonText>User Account Page</ButtonText>
      </Button>
      <Button onPress={() => router.push("/camera-page" as Href)}>
        <ButtonText>Camera Page</ButtonText>
      </Button>
      <Button onPress={() => router.push("/marketplace-page" as Href)}>
        <ButtonText>Marketplace Page</ButtonText>
      </Button>
    </View>
  );
}
