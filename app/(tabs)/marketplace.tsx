import { Button, ButtonText } from "@/components/ui/button";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
} from "@/components/ui/modal";
import { designToDesignProduct } from "@/lib/designs";
import { useAuthState } from "@/hooks/useAuth";
import { useCatalogFromFirestore } from "@/hooks/useCatalogFromFirestore";
import { useSaveDesign } from "@/hooks/useSaveDesign";
import { useSavedDesigns } from "@/hooks/useSavedDesigns";
import { useThemeColors } from "@/hooks/useThemeColors";
import type { Design } from "@/types/design";
import type { Garment } from "@/types/garment";
import { CheckoutModal, type CartItem } from "@/components/checkout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Motion } from "@legendapp/motion";
import { useMemo, useRef, useState } from "react";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Marketplace tab: Threads (garments) and Designs sections.
 * Catalog is loaded from Firestore via useCatalogFromFirestore — no hardcoded data.
 * Pull-to-refresh on iOS/Android refetches from Firestore. Users can save designs when signed in.
 */

/** Garments the user can select to apply designs to (Designs section). */
const MY_GARMENTS = [
  { id: "g1", name: "Classic White Tee" },
  { id: "g2", name: "Black Hoodie" },
  { id: "g3", name: "Navy Crewneck" },
  { id: "g4", name: "Grey Oversized" },
  { id: "g5", name: "Olive Graphic Tee" },
];

type MarketplaceStyles = ReturnType<typeof createMarketplaceStyles>;

function GarmentCard({
  garment,
  onPressImage,
  onAddToCart,
  styles: cardStyles,
  colors,
  entranceDelay = 0,
}: {
  garment: Garment;
  onPressImage: (garment: Garment) => void;
  onAddToCart: (garment: Garment) => void;
  styles: MarketplaceStyles;
  colors: Record<string, string>;
  entranceDelay?: number;
}) {
  return (
    <Motion.View
      style={cardStyles.card}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: "timing", duration: 220, delay: entranceDelay }}
    >
      <Pressable
        style={cardStyles.cardImageWrap}
        onPress={() => onPressImage(garment)}
        accessibilityRole="button"
        accessibilityLabel={`View details for ${garment.name}`}
      >
        <Image source={{ uri: garment.image }} style={cardStyles.cardImage} />
      </Pressable>
      <Text style={cardStyles.cardName} numberOfLines={2}>
        {garment.name}
      </Text>
      {garment.categories.length > 0 && (
        <View style={cardStyles.cardCategories}>
          {garment.categories.slice(0, 2).map((cat) => (
            <View key={cat} style={cardStyles.categoryChip}>
              <Text style={cardStyles.categoryChipText}>{cat}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={cardStyles.cardPriceRow}>
        <Text style={cardStyles.cardPrice}>{garment.price ?? "—"}</Text>
        <Button
          size="sm"
          action="primary"
          onPress={() => onAddToCart(garment)}
          accessibilityLabel={`Add ${garment.name} to cart`}
        >
          <Ionicons name="add" size={18} color={colors.typography950} />
          <Ionicons name="cart" size={18} color={colors.typography950} />
        </Button>
      </View>
    </Motion.View>
  );
}

/**
 * Card for a single design. Bookmark shows saved state from user's savedDesigns;
 * tap to save (when not saved) or unsave (when saved).
 */
function DesignCard({
  design,
  isSaved,
  savedDesignId,
  onSaveDesign,
  onUnsaveDesign,
  onPressImage,
  styles: cardStyles,
  colors,
  entranceDelay = 0,
  saving,
  removing,
}: {
  design: Design;
  isSaved: boolean;
  savedDesignId: string | null;
  onSaveDesign: (design: Design) => void;
  onUnsaveDesign: (savedDesignId: string) => void;
  onPressImage: (design: Design) => void;
  styles: MarketplaceStyles;
  colors: Record<string, string>;
  entranceDelay?: number;
  saving?: boolean;
  removing?: boolean;
}) {
  const handleBookmarkPress = () => {
    if (isSaved && savedDesignId) onUnsaveDesign(savedDesignId);
    else onSaveDesign(design);
  };

  return (
    <Motion.View
      style={cardStyles.card}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: "timing", duration: 220, delay: entranceDelay }}
    >
      <Pressable
        style={cardStyles.cardImageWrap}
        onPress={() => onPressImage(design)}
        accessibilityRole="button"
        accessibilityLabel={`View details for ${design.name}`}
      >
        <Image source={{ uri: design.image }} style={cardStyles.cardImage} />
      </Pressable>
      <Text style={cardStyles.cardName} numberOfLines={2}>
        {design.name}
      </Text>
      {design.categories.length > 0 && (
        <View style={cardStyles.cardCategories}>
          {design.categories.slice(0, 2).map((cat) => (
            <View key={cat} style={cardStyles.categoryChip}>
              <Text style={cardStyles.categoryChipText}>{cat}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={cardStyles.cardPriceRow}>
        <Text style={cardStyles.cardPrice}>{design.price}</Text>
        <Button
          size="sm"
          action={isSaved ? "secondary" : "primary"}
          variant={isSaved ? "outline" : "solid"}
          onPress={handleBookmarkPress}
          isDisabled={saving || removing}
          accessibilityLabel={
            isSaved
              ? `Remove ${design.name} from saved`
              : `Save ${design.name} to your collection`
          }
        >
          <Ionicons
            name={isSaved ? "bookmark" : "bookmark-outline"}
            size={18}
            color={isSaved ? colors.typography500 : colors.typography950}
          />
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
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.outline200,
      backgroundColor: colors.background0,
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
    modalHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    },
    modalBackButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 8,
      paddingRight: 12,
    },
    modalBackButtonText: {
      fontSize: 16,
      color: colors.primary500,
      fontWeight: "500",
    },
    modalDetailMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 6,
    },
    modalDetailLabel: {
      fontSize: 13,
      color: colors.typography500,
    },
    modalDetailValue: {
      fontSize: 15,
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
    },
    cardPriceRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: 10,
      marginTop: 10,
      gap: 8,
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
    fabBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "#e53935",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
    },
    fabBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#fff",
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
    productDetailImage: {
      width: "100%",
      aspectRatio: 1,
      backgroundColor: colors.background100,
      borderRadius: 12,
    },
    productDetailName: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.typography950,
      marginTop: 16,
    },
    productDetailDescription: {
      fontSize: 15,
      color: colors.typography600,
      marginTop: 8,
      lineHeight: 22,
    },
    productDetailMeta: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12,
    },
    productDetailPrice: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.primary500,
    },
    productDetailActions: {
      marginTop: 20,
      gap: 10,
    },
  });
}

/**
 * Marketplace screen: two horizontal pages (Threads | Designs) backed by Firestore.
 * Fetches once on mount; pull-to-refresh triggers a refetch. Loading and error states are shown inline.
 */
export default function MarketplaceTab() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createMarketplaceStyles(colors), [colors]);
  const user = useAuthState();
  const {
    designs,
    garments,
    loading,
    refreshing,
    error,
    refresh: refreshCatalog,
  } = useCatalogFromFirestore();
  const {
    savedDesigns,
    refresh: refreshSavedDesigns,
    remove: removeSavedDesign,
    addOptimistic,
    removingId,
  } = useSavedDesigns(user?.uid ?? null);
  const [currentSection, setCurrentSection] = useState<0 | 1>(0);
  const [selectedGarment, setSelectedGarment] = useState<typeof MY_GARMENTS[0] | null>(null);
  const [garmentModalOpen, setGarmentModalOpen] = useState(false);
  const [selectedGarmentDetail, setSelectedGarmentDetail] = useState<Garment | null>(null);
  const [selectedDesignDetail, setSelectedDesignDetail] = useState<Design | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const { saveDesign, saving, isLoggedIn } = useSaveDesign();

  /** Saved state for a design (auth-only). Used to show bookmark toggled and to unsave. */
  const getSavedState = useCallback(
    (designId: string) => {
      const entry = savedDesigns.find((s) => s.product.productId === designId);
      return { isSaved: !!entry, savedDesignId: entry?.id ?? null };
    },
    [savedDesigns]
  );

  /** Pull-to-refresh: refetch catalog and (when signed in) saved designs with minimal queries. */
  const handlePullRefresh = useCallback(async () => {
    await Promise.all([
      refreshCatalog(),
      user ? refreshSavedDesigns() : Promise.resolve(),
    ]);
  }, [refreshCatalog, user, refreshSavedDesigns]);

  /** Native pull-to-refresh control; uses theme primary for spinner on iOS/Android. */
  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={handlePullRefresh}
        tintColor={colors.primary500}
        colors={[colors.primary500]}
      />
    ),
    [refreshing, handlePullRefresh, colors.primary500]
  );

  const handlePressGarmentImage = (garment: Garment) => {
    setSelectedGarmentDetail(garment);
  };
  const handleAddToCart = (garment: Garment) => {
    if (Platform.OS === "ios" || Platform.OS === "android") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setCart((prev) => {
      const i = prev.findIndex((x) => x.garment.id === garment.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + 1 };
        return next;
      }
      return [...prev, { garment, quantity: 1 }];
    });
    Alert.alert("Added to cart", `"${garment.name}" added. Tap the cart to checkout.`, [{ text: "OK" }]);
  };
  const cartItemCount = cart.reduce((s, i) => s + i.quantity, 0);
  const handleRemoveFromCart = (garmentId: string) => {
    setCart((prev) => prev.filter((x) => x.garment.id !== garmentId));
  };
  const handlePressDesignImage = (design: Design) => {
    setSelectedDesignDetail(design);
  };
  const handleSaveDesign = async (design: Design) => {
    if (!isLoggedIn) {
      Alert.alert(
        "Sign in to save",
        "You need to be logged in to save designs to your account."
      );
      return;
    }
    const result = await saveDesign(designToDesignProduct(design));
    if (result.success) {
      addOptimistic(designToDesignProduct(design), result.savedDesignId);
    } else {
      Alert.alert("Couldn't save", result.error);
    }
  };

  const handleUnsaveDesign = async (savedDesignId: string) => {
    await removeSavedDesign(savedDesignId);
  };
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
        {/* Page 0: Threads — data from Firestore; pull-to-refresh supported. */}
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>Threads</Text>
              <Text style={styles.heroSubtitle}>
                Quality tees, made simple.
              </Text>
            </View>
            {error ? (
              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.error500 }]}>{error}</Text>
                <Button size="sm" variant="outline" onPress={refresh} style={{ marginTop: 12 }}>
                  <ButtonText>Retry</ButtonText>
                </Button>
              </View>
            ) : loading && garments.length === 0 ? (
              <View style={[styles.footer, { paddingVertical: 48 }]}>
                <ActivityIndicator size="large" color={colors.primary500} />
                <Text style={[styles.footerText, { marginTop: 16 }]}>Loading threads…</Text>
              </View>
            ) : (
              <>
                <View style={styles.grid}>
                  {garments.map((garment, index) => (
                    <GarmentCard
                      key={garment.id}
                      garment={garment}
                      onPressImage={handlePressGarmentImage}
                      onAddToCart={handleAddToCart}
                      styles={styles}
                      colors={colors}
                      entranceDelay={index * 40}
                    />
                  ))}
                </View>
                <View style={styles.footer}>
                  <Text style={styles.footerText}>Free shipping on orders over $50</Text>
                </View>
              </>
            )}
          </ScrollView>
        </View>

        {/* Page 1: Designs — data from Firestore; pull-to-refresh supported. */}
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>Designs</Text>
              <Text style={styles.heroSubtitle}>
                Save your favorites. Apply to any garment.
              </Text>
            </View>
            {error ? (
              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.error500 }]}>{error}</Text>
                <Button size="sm" variant="outline" onPress={refresh} style={{ marginTop: 12 }}>
                  <ButtonText>Retry</ButtonText>
                </Button>
              </View>
            ) : loading && designs.length === 0 ? (
              <View style={[styles.footer, { paddingVertical: 48 }]}>
                <ActivityIndicator size="large" color={colors.primary500} />
                <Text style={[styles.footerText, { marginTop: 16 }]}>Loading designs…</Text>
              </View>
            ) : (
              <>
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
                <View style={styles.grid}>
                  {designs.map((design, index) => {
                    const { isSaved, savedDesignId } = getSavedState(design.id);
                    return (
                      <DesignCard
                        key={design.id}
                        design={design}
                        isSaved={isSaved}
                        savedDesignId={savedDesignId}
                        onSaveDesign={handleSaveDesign}
                        onUnsaveDesign={handleUnsaveDesign}
                        onPressImage={handlePressDesignImage}
                        styles={styles}
                        colors={colors}
                        entranceDelay={index * 40}
                        saving={saving}
                        removing={removingId !== null}
                      />
                    );
                  })}
                </View>
                <View style={styles.footer}>
                  <Text style={styles.footerText}>Save designs to your selected garment</Text>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Garment detail modal */}
      <Modal
        isOpen={selectedGarmentDetail !== null}
        onClose={() => setSelectedGarmentDetail(null)}
        size="lg"
      >
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <View style={styles.modalHeaderRow}>
              <Pressable
                style={styles.modalBackButton}
                onPress={() => setSelectedGarmentDetail(null)}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="chevron-back" size={22} color={colors.primary500} />
                <Text style={styles.modalBackButtonText}>Back</Text>
              </Pressable>
              <ModalCloseButton onPress={() => setSelectedGarmentDetail(null)} />
            </View>
          </ModalHeader>
          <ModalBody>
            {selectedGarmentDetail && (
              <>
                <Image
                  source={{ uri: selectedGarmentDetail.image }}
                  style={styles.productDetailImage}
                  resizeMode="cover"
                />
                <Text style={styles.productDetailName}>{selectedGarmentDetail.name}</Text>
                {selectedGarmentDetail.description != null && (
                  <Text style={styles.productDetailDescription}>
                    {selectedGarmentDetail.description}
                  </Text>
                )}
                <View style={styles.productDetailMeta}>
                  {selectedGarmentDetail.price != null && (
                    <Text style={styles.productDetailPrice}>
                      {selectedGarmentDetail.price}
                    </Text>
                  )}
                  <View style={styles.modalDetailMetaRow}>
                    <Text style={styles.modalDetailLabel}>Color:</Text>
                    <Text style={styles.modalDetailValue}>{selectedGarmentDetail.color}</Text>
                  </View>
                  <View style={styles.modalDetailMetaRow}>
                    <Text style={styles.modalDetailLabel}>SKU:</Text>
                    <Text style={styles.modalDetailValue}>{selectedGarmentDetail.sku}</Text>
                  </View>
                  <View style={styles.modalDetailMetaRow}>
                    <Text style={styles.modalDetailLabel}>Author:</Text>
                    <Text style={styles.modalDetailValue}>{selectedGarmentDetail.author}</Text>
                  </View>
                  <View style={styles.modalDetailMetaRow}>
                    <Text style={styles.modalDetailLabel}>Year:</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedGarmentDetail.releaseYear}
                    </Text>
                  </View>
                  <View style={styles.modalDetailMetaRow}>
                    <Text style={styles.modalDetailLabel}>Sizes:</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedGarmentDetail.sizes.join(", ")}
                    </Text>
                  </View>
                  {selectedGarmentDetail.categories.length > 0 && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {selectedGarmentDetail.categories.map((cat) => (
                        <View key={cat} style={styles.categoryChip}>
                          <Text style={styles.categoryChipText}>{cat}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <View style={styles.productDetailActions}>
                  <Button
                    size="md"
                    action="primary"
                    onPress={() => {
                      handleAddToCart(selectedGarmentDetail);
                      setSelectedGarmentDetail(null);
                    }}
                    accessibilityLabel={`Add ${selectedGarmentDetail.name} to cart`}
                  >
                    <Ionicons name="add" size={20} color={colors.typography950} />
                    <Ionicons name="cart" size={20} color={colors.typography950} />
                  </Button>
                </View>
              </>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Design detail modal */}
      <Modal
        isOpen={selectedDesignDetail !== null}
        onClose={() => setSelectedDesignDetail(null)}
        size="lg"
      >
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <View style={styles.modalHeaderRow}>
              <Pressable
                style={styles.modalBackButton}
                onPress={() => setSelectedDesignDetail(null)}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="chevron-back" size={22} color={colors.primary500} />
                <Text style={styles.modalBackButtonText}>Back</Text>
              </Pressable>
              <ModalCloseButton onPress={() => setSelectedDesignDetail(null)} />
            </View>
          </ModalHeader>
          <ModalBody>
            {selectedDesignDetail && (
              <>
                <Image
                  source={{ uri: selectedDesignDetail.image }}
                  style={styles.productDetailImage}
                  resizeMode="cover"
                />
                <Text style={styles.productDetailName}>{selectedDesignDetail.name}</Text>
                <Text style={styles.productDetailDescription}>
                  {selectedDesignDetail.description}
                </Text>
                <View style={styles.productDetailMeta}>
                  <Text style={styles.productDetailPrice}>
                    {selectedDesignDetail.price}
                  </Text>
                  <View style={styles.modalDetailMetaRow}>
                    <Text style={styles.modalDetailLabel}>Author:</Text>
                    <Text style={styles.modalDetailValue}>{selectedDesignDetail.author}</Text>
                  </View>
                  <View style={styles.modalDetailMetaRow}>
                    <Text style={styles.modalDetailLabel}>Created:</Text>
                    <Text style={styles.modalDetailValue}>
                      {new Date(selectedDesignDetail.created).toLocaleDateString()}
                    </Text>
                  </View>
                  {selectedDesignDetail.categories.length > 0 && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {selectedDesignDetail.categories.map((cat) => (
                        <View key={cat} style={styles.categoryChip}>
                          <Text style={styles.categoryChipText}>{cat}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <View style={styles.productDetailActions}>
                  {selectedDesignDetail && (() => {
                    const { isSaved, savedDesignId } = getSavedState(selectedDesignDetail.id);
                    if (!isLoggedIn) {
                      return (
                        <Button
                          size="md"
                          action="primary"
                          onPress={() => selectedDesignDetail && handleSaveDesign(selectedDesignDetail)}
                        >
                          <ButtonText>Save Design</ButtonText>
                        </Button>
                      );
                    }
                    if (isSaved && savedDesignId) {
                      return (
                        <Button
                          size="md"
                          action="secondary"
                          variant="outline"
                          onPress={() => handleUnsaveDesign(savedDesignId)}
                          isDisabled={removingId !== null}
                        >
                          <Ionicons name="bookmark" size={20} color={colors.typography500} style={{ marginRight: 8 }} />
                          <ButtonText>{removingId === savedDesignId ? "Removing…" : "Remove from saved"}</ButtonText>
                        </Button>
                      );
                    }
                    return (
                      <Button
                        size="md"
                        action="primary"
                        onPress={() => handleSaveDesign(selectedDesignDetail)}
                        isDisabled={saving}
                      >
                        <Ionicons name="bookmark-outline" size={20} color={colors.typography950} style={{ marginRight: 8 }} />
                        <ButtonText>{saving ? "Saving…" : "Save Design"}</ButtonText>
                      </Button>
                    );
                  })()}
                </View>
              </>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

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

      {/* Checkout modal */}
      <CheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        cart={cart}
        onRemoveItem={handleRemoveFromCart}
      />

      {/* Cart FAB with badge */}
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
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={() => setCheckoutModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={cartItemCount > 0 ? `Cart has ${cartItemCount} items` : "Open cart"}
        >
          <View style={[styles.fabCircle, saving && { opacity: 0.7 }]}>
            <Ionicons name="cart" size={26} color={colors.typography950} />
            {cartItemCount >= 1 && (
              <View style={styles.fabBadge}>
                <Text style={styles.fabBadgeText}>
                  {cartItemCount > 99 ? "99+" : cartItemCount}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
}
