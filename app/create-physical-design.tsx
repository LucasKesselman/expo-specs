import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { functions, storage } from "../lib/firebase";

interface AssetSlot {
  uri: string;
  name: string;
  mimeType: string;
  width?: number;
  height?: number;
}

type AssetKey =
  | "marketplaceImage"
  | "frontTargetPng"
  | "backTargetPng"
  | "frontTargetZpt"
  | "backTargetZpt";
type MarketplaceStatus = "PUBLIC" | "PRIVATE";

const ASSET_LABELS: Record<AssetKey, string> = {
  marketplaceImage: "Marketplace Display Image",
  frontTargetPng: "Front Target Image (.png)",
  backTargetPng: "Back Target Image (.png)",
  frontTargetZpt: "Front Target File (.zpt)",
  backTargetZpt: "Back Target File (.zpt)",
};

const TEMP_UPLOAD_NAMES: Record<AssetKey, string> = {
  marketplaceImage: "original.jpg",
  frontTargetPng: "frontTargetImage.png",
  backTargetPng: "backTargetImage.png",
  frontTargetZpt: "frontTargetImage.zpt",
  backTargetZpt: "backTargetImage.zpt",
};

function isImageKey(key: AssetKey): boolean {
  return key === "marketplaceImage" || key === "frontTargetPng" || key === "backTargetPng";
}

export default function CreatePhysicalDesignScreen() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [priceText, setPriceText] = useState("");
  const [marketplaceStatus, setMarketplaceStatus] = useState<MarketplaceStatus>("PRIVATE");
  const [assets, setAssets] = useState<Partial<Record<AssetKey, AssetSlot>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const pickAsset = useCallback(async (key: AssetKey) => {
    try {
      if (isImageKey(key)) {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 1,
          allowsEditing: false,
        });
        if (result.canceled || result.assets.length === 0) return;
        const picked = result.assets[0];
        setAssets((prev) => ({
          ...prev,
          [key]: {
            uri: picked.uri,
            name: picked.fileName ?? TEMP_UPLOAD_NAMES[key],
            mimeType: picked.mimeType ?? "image/png",
            width: picked.width,
            height: picked.height,
          },
        }));
      } else {
        const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
        if (result.canceled || result.assets.length === 0) return;
        const picked = result.assets[0];
        setAssets((prev) => ({
          ...prev,
          [key]: {
            uri: picked.uri,
            name: picked.name,
            mimeType: picked.mimeType ?? "application/octet-stream",
          },
        }));
      }
    } catch {
      Alert.alert("Picker Error", `Could not pick file for ${ASSET_LABELS[key]}.`);
    }
  }, []);

  const allAssetsSelected =
    assets.marketplaceImage &&
    assets.frontTargetPng &&
    assets.backTargetPng &&
    assets.frontTargetZpt &&
    assets.backTargetZpt;
  const marketplaceImageMeetsSpec =
    assets.marketplaceImage?.width === 1440 && assets.marketplaceImage?.height === 2560;

  const parsedPriceAmount = Number.parseInt(priceText, 10);
  const priceValid =
    /^\d+$/.test(priceText.trim()) && Number.isInteger(parsedPriceAmount) && parsedPriceAmount >= 0;
  const formValid =
    name.trim().length > 0 &&
    description.trim().length > 0 &&
    priceValid &&
    marketplaceImageMeetsSpec &&
    !!allAssetsSelected;

  const handleSubmit = useCallback(async () => {
    if (!formValid || isSubmitting) return;

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not Signed In", "You must be signed in to create a physical design.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("Uploading assets to staging area...");

    try {
      const uid = user.uid;
      const tempPrefix = `_temp/${uid}`;
      const assetKeys = Object.keys(TEMP_UPLOAD_NAMES) as AssetKey[];
      const tags = tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      for (const key of assetKeys) {
        const slot = assets[key];
        if (!slot) throw new Error(`Missing asset: ${ASSET_LABELS[key]}`);

        setStatusMessage(`Uploading ${ASSET_LABELS[key]}...`);

        const response = await fetch(slot.uri);
        const blob = await response.blob();
        const storagePath = `${tempPrefix}/${TEMP_UPLOAD_NAMES[key]}`;
        const fileRef = ref(storage, storagePath);
        await uploadBytes(fileRef, blob, { contentType: slot.mimeType });
      }

      setStatusMessage("Creating PhysicalDesigns record...");
      const createPhysicalDesign = httpsCallable<
        {
          name: string;
          description: string;
          tags: string[];
          priceAmount: number;
          marketplaceStatus: MarketplaceStatus;
        },
        { designId: string }
      >(functions, "createPhysicalDesign");

      const result = await createPhysicalDesign({
        name: name.trim(),
        description: description.trim(),
        tags,
        priceAmount: parsedPriceAmount,
        marketplaceStatus,
      });

      setStatusMessage(null);
      Alert.alert("Physical Design Created", `Design ID: ${result.data.designId}`);
      setName("");
      setDescription("");
      setTagsText("");
      setPriceText("");
      setMarketplaceStatus("PRIVATE");
      setAssets({});
    } catch (error) {
      setStatusMessage(null);
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      Alert.alert("Error", message);
    } finally {
      setIsSubmitting(false);
    }
  }, [formValid, isSubmitting, assets, tagsText, name, description, parsedPriceAmount, marketplaceStatus]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Design Details</Text>

        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Summer Bloom Tee"
          placeholderTextColor="#6B7280"
          editable={!isSubmitting}
        />

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the physical design for marketplace and production context"
          placeholderTextColor="#6B7280"
          editable={!isSubmitting}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>Tags (comma-separated)</Text>
        <TextInput
          style={styles.input}
          value={tagsText}
          onChangeText={setTagsText}
          placeholder="e.g. floral, summer, limited"
          placeholderTextColor="#6B7280"
          editable={!isSubmitting}
        />

        <Text style={styles.label}>Price (USD) *</Text>
        <TextInput
          style={styles.input}
          value={priceText}
          onChangeText={setPriceText}
          placeholder="e.g. 2999"
          placeholderTextColor="#6B7280"
          keyboardType="number-pad"
          editable={!isSubmitting}
        />
        <Text style={styles.helpText}>Enter price in whole cents (e.g. 2999¢ = $29.99).</Text>

        <Text style={styles.label}>Initial Marketplace Status *</Text>
        <View style={styles.statusChoiceRow}>
          {(["PUBLIC", "PRIVATE"] as MarketplaceStatus[]).map((statusOption) => {
            const selected = statusOption === marketplaceStatus;
            return (
              <Pressable
                key={statusOption}
                style={({ pressed }) => [
                  styles.statusChoice,
                  selected && styles.statusChoiceSelected,
                  pressed && styles.statusChoicePressed,
                ]}
                onPress={() => setMarketplaceStatus(statusOption)}
                disabled={isSubmitting}
              >
                <Text style={[styles.statusChoiceText, selected && styles.statusChoiceTextSelected]}>
                  {statusOption}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.helpText}>
          Sets the initial <Text style={styles.inlineCode}>marketplaceStatus</Text> value on the
          PhysicalDesigns document.
        </Text>

        <Text style={[styles.sectionTitle, styles.assetsSectionTitle]}>Assets</Text>

        {(Object.keys(ASSET_LABELS) as AssetKey[]).map((key) => (
          <View key={key} style={styles.assetBlock}>
            <View style={styles.assetRow}>
              <View style={styles.assetInfo}>
                <Text style={styles.assetLabel}>{ASSET_LABELS[key]}</Text>
                <Text style={styles.assetStatus} numberOfLines={1}>
                  {assets[key]?.name ?? "Not selected"}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.pickButton, pressed && styles.pickButtonPressed]}
                onPress={() => pickAsset(key)}
                disabled={isSubmitting}
              >
                <Text style={styles.pickButtonText}>{assets[key] ? "Change" : "Select"}</Text>
              </Pressable>
            </View>
            {key === "marketplaceImage" ? (
              <Text style={styles.helpText}>
                Required as <Text style={styles.inlineCode}>original.jpg</Text> at exactly 1440 x
                2560.
              </Text>
            ) : null}
          </View>
        ))}
        {assets.marketplaceImage && !marketplaceImageMeetsSpec ? (
          <Text style={styles.validationText}>
            Marketplace Display Image must be exactly 1440 x 2560. Current image:{" "}
            {assets.marketplaceImage.width ?? "?"} x {assets.marketplaceImage.height ?? "?"}.
          </Text>
        ) : null}

        {statusMessage ? (
          <View style={styles.statusRow}>
            <ActivityIndicator color="#93C5FD" size="small" />
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            (!formValid || isSubmitting) && styles.submitButtonDisabled,
            pressed && formValid && !isSubmitting && styles.submitButtonPressed,
          ]}
          onPress={handleSubmit}
          disabled={!formValid || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#111827" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Create Physical Design</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 48,
  },
  sectionTitle: {
    color: "#F9FAFB",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 16,
  },
  assetsSectionTitle: {
    marginTop: 28,
  },
  label: {
    color: "#D1D5DB",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#1F2937",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#F3F4F6",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#374151",
  },
  multilineInput: {
    minHeight: 110,
    paddingTop: 12,
  },
  helpText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 6,
  },
  inlineCode: {
    color: "#D1D5DB",
    fontSize: 12,
    fontWeight: "700",
  },
  statusChoiceRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  statusChoice: {
    backgroundColor: "#1F2937",
    borderColor: "#374151",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusChoiceSelected: {
    borderColor: "#93C5FD",
    backgroundColor: "#1E3A5F",
  },
  statusChoicePressed: {
    opacity: 0.8,
  },
  statusChoiceText: {
    color: "#D1D5DB",
    fontSize: 13,
    fontWeight: "700",
  },
  statusChoiceTextSelected: {
    color: "#BFDBFE",
  },
  assetBlock: {
    marginBottom: 10,
  },
  assetRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1F2937",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#374151",
  },
  assetInfo: {
    flex: 1,
    marginRight: 12,
  },
  assetLabel: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "600",
  },
  assetStatus: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  pickButton: {
    backgroundColor: "#374151",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pickButtonPressed: {
    opacity: 0.7,
  },
  pickButtonText: {
    color: "#93C5FD",
    fontSize: 13,
    fontWeight: "700",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  statusText: {
    color: "#93C5FD",
    fontSize: 14,
    fontWeight: "600",
  },
  validationText: {
    color: "#FCA5A5",
    fontSize: 12,
    fontWeight: "600",
    marginTop: -2,
    marginBottom: 8,
  },
  submitButton: {
    marginTop: 24,
    backgroundColor: "#93C5FD",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonPressed: {
    opacity: 0.8,
  },
  submitButtonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800",
  },
});
