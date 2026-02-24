import { Button, ButtonText } from "@/components/ui/button";
import { useSaveDesign } from "@/hooks/useSaveDesign";
import { PRODUCTS } from "@/lib/products";
import type { DesignProduct } from "@/types/product";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";

function ProductCard({
  product,
  onSaveDesign,
}: {
  product: DesignProduct;
  onSaveDesign: (product: DesignProduct) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardImageWrap}>
        <Image source={{ uri: product.image }} style={styles.cardImage} />
      </View>
      <Text style={styles.cardName} numberOfLines={2}>
        {product.name}
      </Text>
      {product.categories.length > 0 && (
        <View style={styles.cardCategories}>
          {product.categories.slice(0, 2).map((cat) => (
            <View key={cat} style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{cat}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.cardPrice}>{product.price}</Text>
      <View style={styles.cardButtonWrap}>
        <Button size="sm" action="primary" onPress={() => onSaveDesign(product)}>
          <ButtonText>Save Design</ButtonText>
        </Button>
      </View>
    </View>
  );
}

export default function MarketplaceTab() {
  const insets = useSafeAreaInsets();
  const [showCreateDesign, setShowCreateDesign] = useState(false);
  const { saveDesign, saving, isLoggedIn } = useSaveDesign();

  const handleCreateNewDesign = () => {
    Alert.alert("placeholder DB CREATE action");
  };

  const handleSaveDesign = async (product: DesignProduct) => {
    if (!isLoggedIn) {
      Alert.alert(
        "Sign in to save",
        "You need to be logged in to save designs to your account."
      );
      return;
    }
    const result = await saveDesign(product);
    if (result.success) {
      Alert.alert("Saved", `"${product.name}" has been saved to your designs.`);
    } else {
      Alert.alert("Couldn't save", result.error);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Threads</Text>
          <Text style={styles.heroSubtitle}>
            Quality tees, made simple.
          </Text>
        </View>

        {/* Section label */}
        <Text style={styles.sectionTitle}>Shop tees</Text>

        {/* Product grid */}
        <View style={styles.grid}>
          {PRODUCTS.map((product) => (
            <ProductCard
              key={product.productId}
              product={product}
              onSaveDesign={handleSaveDesign}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Free shipping on orders over $50</Text>
        </View>
      </ScrollView>

      {/* Floating + button and create design - fixed, only on this page */}
      <View
        style={[
          styles.fabContainer,
          {
            bottom: insets.bottom + 16,
            right: 16,
          },
        ]}
        pointerEvents="box-none"
      >
        {showCreateDesign && (
          <Pressable
            style={styles.createDesignButton}
            onPress={handleCreateNewDesign}
          >
            <Text style={styles.createDesignButtonText}>Create new design</Text>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            pressed && styles.fabPressed,
          ]}
          onPress={() => setShowCreateDesign((prev) => !prev)}
        >
          <View style={[styles.fabCircle, saving && { opacity: 0.7 }]}>
            <Ionicons name="add" size={28} color="rgba(255,255,255,0.95)" />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  hero: {
    paddingVertical: 28,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  card: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardImageWrap: {
    aspectRatio: 1,
    backgroundColor: "#f1f5f9",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cardName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    marginTop: 10,
    marginHorizontal: 10,
  },
  cardCategories: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginHorizontal: 10,
    marginTop: 6,
  },
  categoryChip: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryChipText: {
    fontSize: 11,
    color: "#475569",
    textTransform: "capitalize",
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563eb",
    marginHorizontal: 10,
    marginTop: 4,
  },
  cardButtonWrap: {
    marginHorizontal: 10,
    marginTop: 10,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    color: "#64748b",
  },
  fabContainer: {
    position: "absolute",
    alignItems: "flex-end",
    gap: 12,
  },
  fab: {
    alignItems: "center",
    justifyContent: "center",
  },
  fabCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(100, 116, 139, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabPressed: {
    opacity: 0.9,
  },
  createDesignButton: {
    backgroundColor: "rgba(37, 99, 235, 0.95)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  createDesignButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
