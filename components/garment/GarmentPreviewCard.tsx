import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

type GarmentPreviewCardProps = {
  garmentId: string;
  nickname?: string;
  version: string;
  color: string;
  size: string;
  thumbnailUrl?: string | null;
  selected?: boolean;
};

export function GarmentPreviewCard({
  garmentId,
  nickname,
  version,
  color,
  size,
  thumbnailUrl,
  selected = false,
}: GarmentPreviewCardProps) {
  const displayName = nickname?.trim() ? nickname.trim() : garmentId;
  const hasImage = Boolean(thumbnailUrl);

  return (
    <View style={[styles.card, selected ? styles.cardSelected : null]}>
      <View style={styles.imageFrame}>
        {hasImage ? (
          <Image
            source={{ uri: thumbnailUrl as string }}
            style={styles.image}
            contentFit="cover"
            transition={180}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.fallback}>
            <Ionicons name="shirt-outline" size={28} color="#BFDBFE" />
            <Text style={styles.fallbackText}>No preview</Text>
          </View>
        )}
      </View>

      <View style={styles.caption}>
        <Text numberOfLines={1} style={styles.nickname}>
          {displayName}
        </Text>
        <Text numberOfLines={1} style={styles.version}>
          {version}
        </Text>
        <View style={styles.metaRow}>
          <Text numberOfLines={1} style={styles.metaValue}>
            {color}
          </Text>
          <Text numberOfLines={1} style={[styles.metaValue, styles.metaValueRight]}>
            {size}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1F2937",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#374151",
    overflow: "hidden",
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: "#60A5FA",
    backgroundColor: "#1E3A8A",
  },
  imageFrame: {
    width: "100%",
    aspectRatio: 9 / 16,
    backgroundColor: "#030712",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#111827",
  },
  fallbackText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
  },
  caption: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
  },
  nickname: {
    color: "#F9FAFB",
    fontSize: 14,
    fontWeight: "800",
  },
  version: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 2,
  },
  metaValue: {
    flex: 1,
    color: "#E5E7EB",
    fontSize: 12,
    fontWeight: "600",
  },
  metaValueRight: {
    textAlign: "right",
  },
});
