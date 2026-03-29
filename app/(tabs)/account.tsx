import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function AccountTabScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Account</Text>

      <Pressable
        style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
        onPress={() => router.push("/create-physical-design")}
      >
        <View style={styles.actionCardIcon}>
          <Ionicons name="add-circle-outline" size={28} color="#93C5FD" />
        </View>
        <View style={styles.actionCardContent}>
          <Text style={styles.actionCardTitle}>Create Physical Design</Text>
          <Text style={styles.actionCardSubtitle}>
            Upload assets and publish a new physical design
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#6B7280" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  heading: {
    color: "#F9FAFB",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 28,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1F2937",
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  actionCardPressed: {
    opacity: 0.75,
  },
  actionCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  actionCardContent: {
    flex: 1,
  },
  actionCardTitle: {
    color: "#F3F4F6",
    fontSize: 16,
    fontWeight: "700",
  },
  actionCardSubtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
});
