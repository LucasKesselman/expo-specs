import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import type { MarketplaceDesign } from "../../types/marketplaceDesign";

type DigitalDesignCardProps = {
  design: MarketplaceDesign;
};

export function DigitalDesignCard({ design }: DigitalDesignCardProps) {
  const previewImageUrl = design.thumbnailUrl ?? design.fullImageUrl ?? design.imageUrl;
  const hasImage = Boolean(previewImageUrl);

  return (
    <View style={styles.cardContainer}>
      {hasImage ? (
        <View style={styles.imageBackground}>
          <Image
            source={{ uri: previewImageUrl as string }}
            style={styles.backgroundImage}
            contentFit="cover"
            transition={180}
            cachePolicy="memory-disk"
          />
          <View style={styles.overlay}>
            <View style={styles.contentColumn}>
              <Text style={styles.cardMeta}>Document ID: {design.documentId}</Text>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {design.name}
              </Text>
              <Text style={styles.cardMeta} numberOfLines={4}>
                {design.description}
              </Text>
              <Text style={styles.cardMeta}>Updated: {design.updatedAt}</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.fallbackBody}>
          <Text style={styles.fallbackLabel}>No preview image</Text>
          <View style={styles.contentColumn}>
            <Text style={styles.cardMeta}>Document ID: {design.documentId}</Text>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {design.name}
            </Text>
            <Text style={styles.cardMeta} numberOfLines={4}>
              {design.description}
            </Text>
            <Text style={styles.cardMeta}>Updated: {design.updatedAt}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    aspectRatio: 9 / 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#030712",
    overflow: "hidden",
  },
  imageBackground: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    flex: 1,
    padding: 12,
    backgroundColor: "rgba(3, 7, 18, 0.62)",
  },
  contentColumn: {
    flex: 1,
    gap: 8,
    justifyContent: "space-between",
  },
  cardTitle: {
    color: "#F9FAFB",
    fontSize: 16,
    fontWeight: "700",
  },
  cardMeta: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "500",
  },
  fallbackBody: {
    flex: 1,
    padding: 12,
    backgroundColor: "#030712",
    gap: 12,
  },
  fallbackLabel: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
