/**
 * Returns the current theme's colors as RGB strings for StyleSheet or inline styles.
 * Use with useTheme() so styles respect light/dark mode. Keys are camelCase tokens,
 * e.g. background0, typography950, primary500.
 */

import { lightVars, darkVars } from '@/components/ui/gluestack-ui-provider/config';
import { getThemeColors } from '@/lib/themeColors';
import { useTheme } from '@/contexts/ThemeContext';

export function useThemeColors(): Record<string, string> {
  const { theme } = useTheme();
  return getThemeColors(theme, { light: lightVars, dark: darkVars });
}
