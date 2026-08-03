import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes } from "firebase/storage";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../contexts/AuthContext";
import { functions, storage } from "../lib/firebase";

const PREVIEW_PLACEHOLDER_ASSET = require("../assets/artie-assets/UIStuff/ArtieSymbolBlack.png");

interface AssetSlot {
  uri: string;
  name: string;
  mimeType: string;
}

type MarketplaceStatus = "PUBLIC" | "PRIVATE";

function isImageMimeType(mimeType: string | undefined): boolean {
  return typeof mimeType === "string" && mimeType.toLowerCase().startsWith("image/");
}

function extensionFromFileName(name: string): string {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === name.length - 1) {
    return "";
  }

  const extension = name.slice(dotIndex).toLowerCase();
  return /^[.][a-z0-9]+$/.test(extension) ? extension : "";
}

function getPlaceholderPreviewSlot(): AssetSlot {
  const resolved = Image.resolveAssetSource(PREVIEW_PLACEHOLDER_ASSET);
  if (!resolved?.uri) {
    throw new Error("Could not resolve the Artie placeholder preview image.");
  }

  return {
    uri: resolved.uri,
    name: "ArtieSymbolBlack.png",
    mimeType: "image/png",
  };
}

export default function CreateDigitalDesignScreen() {
  const router = useRouter();
  const { loading, user } = useAuth();
  const [marketplaceStatus, setMarketplaceStatus] = useState<MarketplaceStatus>("PRIVATE");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [priceText, setPriceText] = useState("");
  const [version, setVersion] = useState("");
  const [designAsset, setDesignAsset] = useState<AssetSlot | null>(null);
  const [previewStill, setPreviewStill] = useState<AssetSlot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isPublic = marketplaceStatus === "PUBLIC";
  const designAssetIsImage = isImageMimeType(designAsset?.mimeType);
  const showPreviewStillPicker = !!designAsset && !designAssetIsImage;

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/(auth)/landing");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (designAssetIsImage) {
      setPreviewStill(null);
    }
  }, [designAssetIsImage]);

  const ensurePhotoLibraryPermission = useCallback(async (): Promise<boolean> => {
    let permission = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }
    if (!permission.granted) {
      Alert.alert(
        "Photo Library Permission",
        "Allow photo library access to upload design images.",
      );
      return false;
    }
    return true;
  }, []);

  const pickDesignAssetFromPhotos = useCallback(async () => {
    try {
      const granted = await ensurePhotoLibraryPermission();
      if (!granted) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsEditing: false,
      });
      if (result.canceled || result.assets.length === 0) return;
      const picked = result.assets[0];
      setDesignAsset({
        uri: picked.uri,
        name: picked.fileName ?? `designAsset-${Date.now()}.jpg`,
        mimeType: picked.mimeType ?? "image/jpeg",
      });
    } catch {
      Alert.alert("Picker Error", "Could not pick a photo for Design Asset.");
    }
  }, [ensurePhotoLibraryPermission]);

  const pickDesignAssetFromFiles = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled || result.assets.length === 0) return;
      const picked = result.assets[0];
      setDesignAsset({
        uri: picked.uri,
        name: picked.name,
        mimeType: picked.mimeType ?? "application/octet-stream",
      });
    } catch {
      Alert.alert("Picker Error", "Could not pick a file for Design Asset.");
    }
  }, []);

  const pickPreviewStill = useCallback(async () => {
    try {
      const granted = await ensurePhotoLibraryPermission();
      if (!granted) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsEditing: false,
      });
      if (result.canceled || result.assets.length === 0) return;
      const picked = result.assets[0];
      setPreviewStill({
        uri: picked.uri,
        name: picked.fileName ?? `previewStill-${Date.now()}.jpg`,
        mimeType: picked.mimeType ?? "image/jpeg",
      });
    } catch {
      Alert.alert("Picker Error", "Could not pick a preview still.");
    }
  }, [ensurePhotoLibraryPermission]);

  const parsedPriceAmount = Number.parseInt(priceText, 10);
  const priceValid =
    /^\d+$/.test(priceText.trim()) && Number.isInteger(parsedPriceAmount) && parsedPriceAmount >= 0;
  const formValid =
    name.trim().length > 0 &&
    description.trim().length > 0 &&
    !!designAsset &&
    (!isPublic || (version.trim().length > 0 && priceValid));

  const uploadSlot = useCallback(async (slot: AssetSlot, key: string, uid: string): Promise<string> => {
    const response = await fetch(slot.uri);
    const blob = await response.blob();
    // Flat staging path (same layout as physical create): _temp/{uid}/{key}{ext}
    const storagePath = `_temp/${uid}/${key}${extensionFromFileName(slot.name)}`;
    const fileRef = ref(storage, storagePath);
    await uploadBytes(fileRef, blob, { contentType: slot.mimeType });
    return storagePath;
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formValid || isSubmitting || !designAsset) return;

    if (!user) {
      Alert.alert("Not Signed In", "Please log in from the Account tab to create a digital design.", [
        { text: "Cancel", style: "cancel" },
        { text: "Go to Login", onPress: () => router.push("/(auth)/landing") },
      ]);
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("Uploading assets to staging area...");

    try {
      const uid = user.uid;
      const tags = isPublic
        ? tagsText
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
        : [];

      setStatusMessage("Uploading Design Asset...");
      const designAssetPath = await uploadSlot(designAsset, "designAsset", uid);

      let previewImagePath: string;
      if (designAssetIsImage) {
        setStatusMessage("Uploading listing preview...");
        previewImagePath = await uploadSlot(designAsset, "previewImage", uid);
      } else if (previewStill) {
        setStatusMessage("Uploading Preview Still...");
        previewImagePath = await uploadSlot(previewStill, "previewImage", uid);
      } else {
        setStatusMessage("Uploading placeholder preview...");
        previewImagePath = await uploadSlot(getPlaceholderPreviewSlot(), "previewImage", uid);
      }

      setStatusMessage("Creating DigitalDesigns record...");
      const createDigitalDesign = httpsCallable<
        {
          name: string;
          description: string;
          tags: string[];
          priceAmount: number;
          marketplaceStatus: MarketplaceStatus;
          version: string;
          previewImagePath: string;
          designAssetPath: string;
        },
        { designId: string }
      >(functions, "createDigitalDesign");

      const result = await createDigitalDesign({
        name: name.trim(),
        description: description.trim(),
        tags,
        priceAmount: isPublic ? parsedPriceAmount : 0,
        marketplaceStatus,
        version: isPublic ? version.trim() : "",
        previewImagePath,
        designAssetPath,
      });

      setStatusMessage(null);
      Alert.alert("Digital Design Created", `Design ID: ${result.data.designId}`);
      setMarketplaceStatus("PRIVATE");
      setName("");
      setDescription("");
      setTagsText("");
      setPriceText("");
      setVersion("");
      setDesignAsset(null);
      setPreviewStill(null);
    } catch (error) {
      setStatusMessage(null);
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      Alert.alert("Error", message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    formValid,
    isSubmitting,
    designAsset,
    user,
    router,
    isPublic,
    tagsText,
    uploadSlot,
    designAssetIsImage,
    previewStill,
    name,
    description,
    parsedPriceAmount,
    marketplaceStatus,
    version,
  ]);

  if (loading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#93C5FD" size="small" />
        <Text style={styles.loadingText}>Checking account access...</Text>
      </View>
    );
  }

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

        <Text style={styles.label}>Marketplace Status *</Text>
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
          DigitalDesigns document. PUBLIC listings appear in the marketplace; PRIVATE designs appear
          only in your wardrobe.
        </Text>

        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Summer Bloom v2"
          placeholderTextColor="#6B7280"
          editable={!isSubmitting}
        />

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the digital design"
          placeholderTextColor="#6B7280"
          editable={!isSubmitting}
          multiline
          textAlignVertical="top"
        />

        {isPublic ? (
          <>
            <Text style={styles.label}>Version *</Text>
            <TextInput
              style={styles.input}
              value={version}
              onChangeText={setVersion}
              placeholder="e.g. RT.2504.1"
              placeholderTextColor="#6B7280"
              editable={!isSubmitting}
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
          </>
        ) : null}

        <Text style={[styles.sectionTitle, styles.assetsSectionTitle]}>Assets</Text>

        <View style={styles.assetBlock}>
          <View style={styles.assetRow}>
            <View style={styles.assetInfo}>
              <Text style={styles.assetLabel}>Design Asset *</Text>
              <Text style={styles.assetStatus} numberOfLines={1}>
                {designAsset?.name ?? "Not selected"}
              </Text>
            </View>
            <View style={styles.assetButtonColumn}>
              <Pressable
                style={({ pressed }) => [styles.pickButton, pressed && styles.pickButtonPressed]}
                onPress={pickDesignAssetFromPhotos}
                disabled={isSubmitting}
              >
                <Text style={styles.pickButtonText}>Photos</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.pickButton, pressed && styles.pickButtonPressed]}
                onPress={pickDesignAssetFromFiles}
                disabled={isSubmitting}
              >
                <Text style={styles.pickButtonText}>Files</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.helpText}>
            Photos opens your photo library. Files opens the document picker (e.g. .gltf).
          </Text>
        </View>

        {showPreviewStillPicker ? (
          <View style={styles.assetBlock}>
            <View style={styles.assetRow}>
              <View style={styles.assetInfo}>
                <Text style={styles.assetLabel}>Preview Still</Text>
                <Text style={styles.assetStatus} numberOfLines={1}>
                  {previewStill?.name ?? "Not selected"}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.pickButton, pressed && styles.pickButtonPressed]}
                onPress={pickPreviewStill}
                disabled={isSubmitting}
              >
                <Text style={styles.pickButtonText}>{previewStill ? "Change" : "Select"}</Text>
              </Pressable>
            </View>
            <Text style={styles.helpText}>
              Optional. Used to generate marketplace card, mini, and thumbnail images. If no preview
              still is selected, the Artie symbol placeholder image will be used instead.
            </Text>
          </View>
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
            <Text style={styles.submitButtonText}>Create Digital Design</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#D1D5DB",
    fontSize: 14,
    fontWeight: "600",
  },
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
    flexWrap: "wrap",
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
  assetButtonColumn: {
    gap: 8,
  },
  pickButton: {
    backgroundColor: "#374151",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
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
