import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { SavedDesignsProvider } from "@/contexts/SavedDesignsContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import "@/global.css";

function ThemeableGluestack() {
  const { theme } = useTheme();
  return (
    <GluestackUIProvider mode={theme}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
    </GluestackUIProvider>
  );
}

/** Root layout: SafeArea, theme persistence, Gluestack, shared saved-designs state, and stack router. */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SavedDesignsProvider>
          <ThemeableGluestack />
        </SavedDesignsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
