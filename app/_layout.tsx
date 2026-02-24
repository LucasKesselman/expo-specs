import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import "@/global.css";

function ThemeableGluestack() {
  const { theme } = useTheme();
  return (
    <GluestackUIProvider mode={theme}>
      <Stack screenOptions={{ headerShown: false }} />
    </GluestackUIProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemeableGluestack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
