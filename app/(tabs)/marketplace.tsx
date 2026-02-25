import { Button, ButtonText } from "@/components/ui/button";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
} from "@/components/ui/modal";
import { useSaveDesign } from "@/hooks/useSaveDesign";
import { PRODUCTS } from "@/lib/products";
import type { DesignProduct } from "@/types/product";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Alert,
  Dimensions,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, useState } from "react";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/** Example garments the user "owns" for the Designs section */
const MY_GARMENTS = [
  { id: "g1", name: "Classic White Tee" },
  { id: "g2", name: "Black Hoodie" },
  { id: "g3", name: "Navy Crewneck" },
  { id: "g4", name: "Grey Oversized" },
  { id: "g5", name: "Olive Graphic Tee" },
];

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
  const [currentSection, setCurrentSection] = useState<0 | 1>(0);
  const [selectedGarment, setSelectedGarment] = useState<typeof MY_GARMENTS[0] | null>(null);
  const [garmentModalOpen, setGarmentModalOpen] = useState(false);
  const { saveDesign, saving, isLoggedIn } = useSaveDesign();
  const horizontalScrollRef = useRef<ScrollView>(null);

  const onHorizontalScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / SCREEN_WIDTH) as 0 | 1;
    if (index !== currentSection) setCurrentSection(index);
  };

  const scrollToSection = (index: 0 | 1) => {
    setCurrentSection(index);
    horizontalScrollRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });
  };

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
      {/* Tab strip: Threads | Designs */}
      <View style={styles.tabStrip}>
        <Pressable
          style={[styles.tab, currentSection === 0 && styles.tabActive]}
          onPress={() => scrollToSection(0)}
        >
          <Text style={[styles.tabText, currentSection === 0 && styles.tabTextActive]}>
            Threads
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, currentSection === 1 && styles.tabActive]}
          onPress={() => scrollToSection(1)}
        >
          <Text style={[styles.tabText, currentSection === 1 && styles.tabTextActive]}>
            Designs
          </Text>
        </Pressable>
      </View>

      {/* Horizontal pager: swipe between Threads and Designs */}
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onHorizontalScroll}
        style={styles.pager}
        contentContainerStyle={styles.pagerContent}
      >
        {/* Page 0: Threads */}
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>Threads</Text>
              <Text style={styles.heroSubtitle}>
                Quality tees, made simple.
              </Text>
            </View>
            <Text style={styles.sectionTitle}>Shop tees</Text>
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
        </View>

        {/* Page 1: Designs */}
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              style={styles.garmentSelector}
              onPress={() => setGarmentModalOpen(true)}
            >
              <Text style={styles.garmentSelectorLabel}>Currently selected Garment</Text>
              <Text
                style={[
                  styles.garmentSelectorValue,
                  !selectedGarment && { color: "#94a3b8" },
                ]}
              >
                {selectedGarment ? selectedGarment.name : "Tap to choose…"}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </Pressable>
            <Text style={styles.sectionTitle}>Designs</Text>
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
              <Text style={styles.footerText}>Save designs to your selected garment</Text>
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* Garment picker modal */}
      <Modal isOpen={garmentModalOpen} onClose={() => setGarmentModalOpen(false)} size="md">
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Text style={styles.modalTitle}>Choose a garment</Text>
            <ModalCloseButton onPress={() => setGarmentModalOpen(false)} />
          </ModalHeader>
          <ModalBody>
            {MY_GARMENTS.map((g) => (
              <Pressable
                key={g.id}
                style={[
                  styles.garmentOption,
                  selectedGarment?.id === g.id && styles.garmentOptionSelected,
                ]}
                onPress={() => {
                  setSelectedGarment(g);
                  setGarmentModalOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.garmentOptionText,
                    selectedGarment?.id === g.id && styles.garmentOptionTextSelected,
                  ]}
                >
                  {g.name}
                </Text>
                {selectedGarment?.id === g.id && (
                  <Ionicons name="checkmark-circle" size={22} color="#2563eb" />
                )}
              </Pressable>
            ))}
          </ModalBody>
        </ModalContent>
      </Modal>

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
  tabStrip: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: "#e0e7ff",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
  },
  tabTextActive: {
    color: "#3730a3",
  },
  pager: {
    flex: 1,
  },
  pagerContent: {},
  page: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  garmentSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  garmentSelectorLabel: {
    fontSize: 13,
    color: "#64748b",
    marginRight: "auto",
  },
  garmentSelectorValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
  },
  garmentOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: "#f8fafc",
  },
  garmentOptionSelected: {
    backgroundColor: "#eff6ff",
  },
  garmentOptionText: {
    fontSize: 16,
    color: "#334155",
  },
  garmentOptionTextSelected: {
    fontWeight: "600",
    color: "#1e40af",
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
