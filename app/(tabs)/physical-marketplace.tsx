import { StyleSheet, Text, View } from "react-native";

export default function PhysicalMarketplaceTabScreen() {
  return (
    <View style={physicalMarketplaceStyles.placeholderScreenContainer}>
      <Text style={physicalMarketplaceStyles.centeredPlaceholderText}>
        placeholder physical marketplace content
      </Text>
    </View>
  );
}

const physicalMarketplaceStyles = StyleSheet.create({
  placeholderScreenContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#111827",
  },
  centeredPlaceholderText: {
    color: "#e2e8f0",
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
});
