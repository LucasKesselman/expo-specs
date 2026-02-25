/**
 * Resolves Gluestack/NativeWind theme variable objects to RGB strings for use in
 * StyleSheet or inline styles. Use with useTheme() so styles respect light/dark mode.
 */

type ThemeMode = 'light' | 'dark';

type ThemeVars = Record<string, string>;

/**
 * Converts a theme vars object (e.g. '--color-background-0': '18 18 18')
 * into a flat map of keys like background0 -> 'rgb(18, 18, 18)'.
 */
function varsToRgbMap(vars: ThemeVars): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(vars)) {
    if (!key.startsWith('--color-') || typeof value !== 'string') continue;
    const name = key.replace('--color-', '').replace(/-/g, '');
    out[name] = `rgb(${value.trim().replace(/\s+/g, ', ')})`;
  }
  return out;
}

/**
 * Returns the current theme's colors as RGB strings for use in StyleSheet or inline styles.
 * Keys are camelCase token names, e.g. background0, typography950, primary500.
 *
 * @param mode - Current theme mode from useTheme()
 * @param varsMap - Map of mode to raw vars object (from theme config)
 * @returns Object of color name -> 'rgb(r, g, b)'
 */
export function getThemeColors(
  mode: ThemeMode,
  varsMap: { light: ThemeVars; dark: ThemeVars }
): Record<string, string> {
  const vars = varsMap[mode];
  return varsToRgbMap(vars);
}
