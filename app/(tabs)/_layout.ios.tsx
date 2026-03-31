import {
  Icon,
  Label,
  NativeTabs,
} from "expo-router/unstable-native-tabs";
import type { ComponentType, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

// Development-build-first path:
// iOS uses native tabs (SDK 55) when running in a native development build.
const tabsTintColor = "yellow";
const nativeTabsWithBottomAccessory = NativeTabs as typeof NativeTabs & {
  BottomAccessory?: ComponentType<{ children?: ReactNode }>;
};

function SelectedDigitalDesignAccessory() {
  return (
    <View style={selectedDigitalDesignAccessoryStyles.container}>
      <View style={selectedDigitalDesignAccessoryStyles.leftContent}>
        <Text style={selectedDigitalDesignAccessoryStyles.titleText}>
          Currently selected digital design:
        </Text>
        <Text style={selectedDigitalDesignAccessoryStyles.subtitleText}>
          placeholder design name
        </Text>
      </View>

      <View style={selectedDigitalDesignAccessoryStyles.imagePlaceholder}>
        <Text style={selectedDigitalDesignAccessoryStyles.imagePlaceholderText}>
          image
        </Text>
      </View>
    </View>
  );
}

export default function TabsLayoutIOS() {
  return (
    <NativeTabs
      backgroundColor="#111827"
      disableTransparentOnScrollEdge={true}
      tintColor={tabsTintColor}
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="digital-marketplace">
        <Label>Digital Marketplace</Label>
        <Icon sf="photo.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="physical-marketplace">
        <Label>Physical Marketplace</Label>
        <Icon sf="tshirt.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account">
        <Label>Account</Label>
        <Icon sf="person.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="camera" role="search">
        <Label>Camera</Label>
        <Icon sf={{ default: "camera.fill", selected: "camera.fill" }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="wardrobe">
        <Label>Wardrobe</Label>
        <Icon sf="tshirt.fill" />
      </NativeTabs.Trigger>

      {nativeTabsWithBottomAccessory.BottomAccessory ? (
        <nativeTabsWithBottomAccessory.BottomAccessory>
          <SelectedDigitalDesignAccessory />
        </nativeTabsWithBottomAccessory.BottomAccessory>
      ) : null}
    </NativeTabs>
  );
}

const selectedDigitalDesignAccessoryStyles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#030712",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 70,
  },
  leftContent: {
    flex: 1,
    paddingRight: 12,
  },
  titleText: {
    color: "#E5E7EB",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "left",
  },
  subtitleText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "left",
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    color: "#D1D5DB",
    fontSize: 11,
    fontWeight: "600",
  },
});
