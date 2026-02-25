import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
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

/** Root layout: SafeArea, theme persistence, Gluestack, and stack router. */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemeableGluestack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
