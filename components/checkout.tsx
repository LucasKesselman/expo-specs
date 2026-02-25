import { Button, ButtonText } from "@/components/ui/button";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
} from "@/components/ui/modal";
import { useThemeColors } from "@/hooks/useThemeColors";
import type { Garment } from "@/types/garment";
import { useMemo } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export type CartItem = { garment: Garment; quantity: number };

type CheckoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemoveItem: (garmentId: string) => void;
};

/**
 * Checkout modal: lists cart items and placeholder Stripe checkout.
 * Stripe integration is not implemented; UI and copy are placeholders.
 */
export function CheckoutModal({ isOpen, onClose, cart, onRemoveItem }: CheckoutModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createCheckoutStyles(colors), [colors]);

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Checkout</Text>
            <ModalCloseButton onPress={onClose} />
          </View>
        </ModalHeader>
        <ModalBody>
          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* Cart items */}
            <Text style={styles.sectionLabel}>Your cart ({totalItems} item{totalItems !== 1 ? "s" : ""})</Text>
            {cart.length === 0 ? (
              <Text style={styles.emptyText}>Your cart is empty. Add garments from Threads.</Text>
            ) : (
              <View style={styles.cartList}>
                {cart.map(({ garment, quantity }) => (
                  <View key={garment.id} style={styles.cartRow}>
                    <Image source={{ uri: garment.image }} style={styles.cartThumb} />
                    <View style={styles.cartInfo}>
                      <Text style={styles.cartName} numberOfLines={2}>{garment.name}</Text>
                      <Text style={styles.cartMeta}>
                        {garment.price ?? "—"} × {quantity}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => onRemoveItem(garment.id)}
                      style={styles.removeBtn}
                      accessibilityLabel={`Remove ${garment.name} from cart`}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.error500} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Placeholder Stripe checkout */}
            <View style={styles.stripeSection}>
              <Text style={styles.sectionLabel}>Payment (Stripe placeholder)</Text>
              <View style={styles.stripePlaceholder}>
                <Text style={styles.stripePlaceholderText}>
                  With Stripe integrated: you would enter billing details here and complete payment securely. No
                  payment is processed in this build.
                </Text>
                <Button size="md" action="primary" isDisabled={cart.length === 0}>
                  <ButtonText>Pay with Stripe (placeholder)</ButtonText>
                </Button>
              </View>
            </View>
          </ScrollView>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

function createCheckoutStyles(colors: Record<string, string>) {
  return StyleSheet.create({
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    },
    title: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.typography950,
    },
    bodyScroll: {
      maxHeight: 400,
    },
    sectionLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.typography700,
      marginBottom: 10,
    },
    emptyText: {
      fontSize: 15,
      color: colors.typography500,
      marginBottom: 20,
    },
    cartList: {
      gap: 12,
      marginBottom: 24,
    },
    cartRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.background50,
      borderRadius: 12,
      padding: 12,
      gap: 12,
    },
    cartThumb: {
      width: 56,
      height: 56,
      borderRadius: 8,
      backgroundColor: colors.background100,
    },
    cartInfo: {
      flex: 1,
    },
    cartName: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.typography950,
    },
    cartMeta: {
      fontSize: 13,
      color: colors.typography500,
      marginTop: 4,
    },
    removeBtn: {
      padding: 8,
    },
    stripeSection: {
      marginTop: 8,
    },
    stripePlaceholder: {
      backgroundColor: colors.secondary100,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.outline200,
      gap: 12,
    },
    stripePlaceholderText: {
      fontSize: 14,
      color: colors.typography600,
      lineHeight: 20,
    },
  });
}
