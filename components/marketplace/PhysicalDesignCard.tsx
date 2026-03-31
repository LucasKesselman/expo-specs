import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import type { MarketplaceDesign } from "../../types/marketplaceDesign";

type PhysicalDesignCardProps = {
  design: MarketplaceDesign;
};

export function PhysicalDesignCard({ design }: PhysicalDesignCardProps) {
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
            <Text style={styles.cardTitle} numberOfLines={2}>
              {design.name}
            </Text>
            <View style={styles.bottomDetailsColumn}>
              <View style={styles.priceBadge}>
                <Text style={styles.priceBadgeText}>{design.price}</Text>
              </View>
              <Text style={styles.cardMeta} numberOfLines={1}>
                Document ID: {design.documentId}
              </Text>
              <Text style={styles.cardMeta}>Created: {design.createdAt}</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.fallbackBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {design.name}
          </Text>
          <View style={styles.bottomDetailsColumn}>
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>{design.price}</Text>
            </View>
            <Text style={styles.cardMeta} numberOfLines={1}>
              Document ID: {design.documentId}
            </Text>
            <Text style={styles.cardMeta}>Created: {design.createdAt}</Text>
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
    justifyContent: "space-between",
  },
  bottomDetailsColumn: {
    gap: 8,
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
  priceBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(14, 165, 233, 0.9)",
  },
  priceBadgeText: {
    color: "#0B1120",
    fontSize: 12,
    fontWeight: "800",
  },
  fallbackBody: {
    flex: 1,
    padding: 12,
    backgroundColor: "#030712",
    gap: 12,
    justifyContent: "space-between",
  },
  fallbackLabel: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
