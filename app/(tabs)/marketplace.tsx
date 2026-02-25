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
import { useThemeColors } from "@/hooks/useThemeColors";
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
import { Motion, AnimatePresence } from "@legendapp/motion";
import { useMemo, useRef, useState } from "react";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Marketplace tab: Threads (product grid) and Designs (saved-to-garment) sections.
 * Users can save designs when signed in; garment picker and FAB for "Create new design".
 */

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
  styles: cardStyles,
  entranceDelay = 0,
}: {
  product: DesignProduct;
  onSaveDesign: (product: DesignProduct) => void;
  styles: ReturnType<typeof createMarketplaceStyles>;
  entranceDelay?: number;
}) {
  return (
    <Motion.View
      style={cardStyles.card}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: "timing", duration: 220, delay: entranceDelay }}
    >
      <View style={cardStyles.cardImageWrap}>
        <Image source={{ uri: product.image }} style={cardStyles.cardImage} />
      </View>
      <Text style={cardStyles.cardName} numberOfLines={2}>
        {product.name}
      </Text>
      {product.categories.length > 0 && (
        <View style={cardStyles.cardCategories}>
          {product.categories.slice(0, 2).map((cat) => (
            <View key={cat} style={cardStyles.categoryChip}>
              <Text style={cardStyles.categoryChipText}>{cat}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={cardStyles.cardPrice}>{product.price}</Text>
      <View style={cardStyles.cardButtonWrap}>
        <Button size="sm" action="primary" onPress={() => onSaveDesign(product)}>
          <ButtonText>Save Design</ButtonText>
        </Button>
      </View>
    </Motion.View>
  );
}

function createMarketplaceStyles(colors: Record<string, string>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background0,
    },
    tabStrip: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.outline200,
      backgroundColor: colors.secondary0,
    },
    tab: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
    },
    tabActive: {
      backgroundColor: colors.primary200,
    },
    tabText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.typography500,
    },
    tabTextActive: {
      color: colors.primary600,
    },
    pager: { flex: 1 },
    pagerContent: {},
    page: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    garmentSelector: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.secondary0,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.outline200,
      gap: 8,
    },
    garmentSelectorLabel: {
      fontSize: 13,
      color: colors.typography500,
      marginRight: "auto",
    },
    garmentSelectorValue: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.typography950,
    },
    garmentSelectorValueMuted: {
      color: colors.typography400,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.typography950,
    },
    garmentOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginBottom: 6,
      backgroundColor: colors.background50,
    },
    garmentOptionSelected: {
      backgroundColor: colors.primary200,
    },
    garmentOptionText: {
      fontSize: 16,
      color: colors.typography700,
    },
    garmentOptionTextSelected: {
      fontWeight: "600",
      color: colors.primary600,
    },
    hero: {
      paddingVertical: 28,
      paddingHorizontal: 4,
      alignItems: "center",
    },
    heroTitle: {
      fontSize: 32,
      fontWeight: "700",
      color: colors.typography950,
      letterSpacing: -0.5,
    },
    heroSubtitle: {
      fontSize: 16,
      color: colors.typography500,
      marginTop: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.typography700,
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
      backgroundColor: colors.secondary0,
      borderRadius: 12,
      overflow: "hidden",
      paddingBottom: 12,
      shadowColor: colors.typography0,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
    cardImageWrap: {
      aspectRatio: 1,
      backgroundColor: colors.background100,
    },
    cardImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    cardName: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.typography950,
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
      backgroundColor: colors.outline200,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    categoryChipText: {
      fontSize: 11,
      color: colors.typography400,
      textTransform: "capitalize",
    },
    cardPrice: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary500,
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
      color: colors.typography500,
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
      backgroundColor: colors.secondary200,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.typography0,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    fabPressed: {
      opacity: 0.9,
    },
    createDesignButton: {
      backgroundColor: colors.primary500,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      shadowColor: colors.typography0,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 3,
    },
    createDesignButtonText: {
      color: colors.typography950,
      fontSize: 15,
      fontWeight: "600",
    },
  });
}

export default function MarketplaceTab() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createMarketplaceStyles(colors), [colors]);
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
              {PRODUCTS.map((product, index) => (
                <ProductCard
                  key={product.productId}
                  product={product}
                  onSaveDesign={handleSaveDesign}
                  styles={styles}
                  entranceDelay={index * 40}
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
                  !selectedGarment && styles.garmentSelectorValueMuted,
                ]}
              >
                {selectedGarment ? selectedGarment.name : "Tap to choose…"}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.typography500} />
            </Pressable>
            <Text style={styles.sectionTitle}>Designs</Text>
            <View style={styles.grid}>
              {PRODUCTS.map((product, index) => (
                <ProductCard
                  key={product.productId}
                  product={product}
                  onSaveDesign={handleSaveDesign}
                  styles={styles}
                  entranceDelay={index * 40}
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
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary500} />
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
        <AnimatePresence>
          {showCreateDesign && (
            <Motion.View
              key="create-design-btn"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "timing", duration: 200 }}
              style={{ marginBottom: 4 }}
            >
              <Pressable
                style={styles.createDesignButton}
                onPress={handleCreateNewDesign}
              >
                <Text style={styles.createDesignButtonText}>Create new design</Text>
              </Pressable>
            </Motion.View>
          )}
        </AnimatePresence>
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            pressed && styles.fabPressed,
          ]}
          onPress={() => setShowCreateDesign((prev) => !prev)}
        >
          <View style={[styles.fabCircle, saving && { opacity: 0.7 }]}>
            <Ionicons name="add" size={28} color={colors.typography950} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
