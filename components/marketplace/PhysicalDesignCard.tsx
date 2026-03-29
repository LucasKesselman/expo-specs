import { Image, StyleSheet, Text, View } from "react-native";

import type { MarketplaceDesign } from "../../types/marketplaceDesign";

type PhysicalDesignCardProps = {
  design: MarketplaceDesign;
};

export function PhysicalDesignCard({ design }: PhysicalDesignCardProps) {
  return (
    <View style={styles.cardContainer}>
      {design.imageUrl ? (
        <Image source={{ uri: design.imageUrl }} style={styles.thumbnailImage} />
      ) : (
        <View style={styles.thumbnailFallback}>
          <Text style={styles.thumbnailFallbackText}>No image</Text>
        </View>
      )}

      <View style={styles.contentColumn}>
        <Text style={styles.cardTitle}>{design.name}</Text>
        <Text style={styles.cardMeta}>Document ID: {design.documentId}</Text>
        <Text style={styles.cardMeta}>Price: {design.price}</Text>
        <Text style={styles.cardMeta}>Created: {design.createdAt}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#030712",
  },
  thumbnailImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "#111827",
  },
  thumbnailFallback: {
    width: 72,
    height: 72,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1F2937",
  },
  thumbnailFallbackText: {
    color: "#D1D5DB",
    fontSize: 10,
    fontWeight: "600",
  },
  contentColumn: {
    flex: 1,
    gap: 4,
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
});
