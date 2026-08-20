import { ScrollView, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type LegalSection = {
  heading: string;
  body: string;
};

type LegalDocumentScreenProps = {
  lastUpdated: string;
  intro?: string;
  sections: LegalSection[];
  footer?: string;
};

export function LegalDocumentScreen({
  lastUpdated,
  intro,
  sections,
  footer,
}: LegalDocumentScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: Math.max(insets.bottom, 24) + 16 },
      ]}
    >
      <Text style={styles.lastUpdated}>Last updated: {lastUpdated}</Text>
      {intro ? <Text style={styles.body}>{intro}</Text> : null}
      {sections.map((section) => (
        <Text key={section.heading}>
          <Text style={styles.heading}>{section.heading}</Text>
          {"\n"}
          <Text style={styles.body}>{section.body}</Text>
        </Text>
      ))}
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 18,
  },
  lastUpdated: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
  },
  heading: {
    color: "#F9FAFB",
    fontSize: 17,
    fontWeight: "700",
  },
  body: {
    color: "#D1D5DB",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  footer: {
    color: "#9CA3AF",
    fontSize: 13,
    lineHeight: 20,
    fontStyle: "italic",
    marginTop: 4,
  },
});
