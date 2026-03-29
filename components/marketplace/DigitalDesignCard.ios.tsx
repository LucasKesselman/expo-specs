import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import type { MarketplaceDesign } from "../../types/marketplaceDesign";

type DigitalDesignCardProps = {
  design: MarketplaceDesign;
};

export function DigitalDesignCard({ design }: DigitalDesignCardProps) {
  const previewImageUrl = design.thumbnailUrl ?? design.fullImageUrl ?? design.imageUrl;

  return (
    <View style={styles.cardContainer}>
      {previewImageUrl ? (
        <Image
          source={{ uri: previewImageUrl }}
          style={styles.heroImage}
          transition={180}
          cachePolicy="memory-disk"
          contentFit="cover"
        />
      ) : (
        <View style={styles.heroFallback}>
          <Text style={styles.heroFallbackText}>No preview</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {design.name}
        </Text>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {design.description}
        </Text>
        <View style={styles.metadataRow}>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {design.documentId}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {design.updatedAt}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#030712",
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#111827",
  },
  heroFallback: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
  },
  heroFallbackText: {
    color: "#D1D5DB",
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    padding: 10,
    gap: 6,
  },
  cardTitle: {
    color: "#F9FAFB",
    fontSize: 15,
    fontWeight: "700",
  },
  cardDescription: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "500",
  },
  metadataRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardMeta: {
    flex: 1,
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
});
