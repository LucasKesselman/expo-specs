import { StyleSheet, Text, View } from "react-native";

type BatchAvailabilityProps = {
  /** Garments still available in this design's batch */
  available?: number;
  /** Total garments in the batch */
  total?: number;
};

export function BatchAvailability({ available = 100, total = 100 }: BatchAvailabilityProps) {
  const safeTotal = Math.max(0, total);
  const safeAvailable = Math.min(safeTotal, Math.max(0, available));
  const pct = safeTotal > 0 ? Math.round((safeAvailable / safeTotal) * 100) : 0;
  const isFullBatch = safeTotal > 0 && safeAvailable === safeTotal;
  const isLow = safeTotal > 0 && safeAvailable / safeTotal <= 0.2 && safeAvailable > 0;
  const isGone = safeTotal > 0 && safeAvailable === 0;

  const fillColor = isGone ? "#DC7777" : isLow ? "#C7A66A" : "#6DA3AE";

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Text style={styles.label}>Garments left</Text>
        <View style={styles.fractionRow}>
          <Text style={styles.availableNum}>{safeAvailable}</Text>
          <Text style={styles.slash}>/</Text>
          <Text style={styles.totalNum}>{safeTotal}</Text>
        </View>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%`, backgroundColor: fillColor, minWidth: pct > 0 ? 4 : 0 },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "stretch",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(109, 163, 174, 0.45)",
    backgroundColor: "rgba(109, 163, 174, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  topRow: {
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 2,
  },
  label: {
    flex: 1,
    color: "#C7DCE0",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  fractionRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexShrink: 0,
  },
  availableNum: {
    color: "#E5E7EB",
    fontSize: 18,
    fontWeight: "800",
  },
  slash: {
    color: "#78889B",
    fontSize: 14,
    fontWeight: "700",
    marginHorizontal: 2,
  },
  totalNum: {
    color: "#9AA8B8",
    fontSize: 14,
    fontWeight: "700",
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.09)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
});
