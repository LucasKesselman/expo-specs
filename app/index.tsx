import { type Href, useRouter } from "expo-router";
import { Button, Text, View } from "react-native";

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
      <Button
        title="User Auth Page"
        onPress={() => router.push("/user-auth-page" as Href)}
      />
      <Button
        title="User Account Page"
        onPress={() => router.push("/user-account-page" as Href)}
      />
      <Button
        title="Camera Page"
        onPress={() => router.push("/camera-page" as Href)}
      />
      <Button
        title="Marketplace Page"
        onPress={() => router.push("/marketplace-page" as Href)}
      />
    </View>
  );
}
