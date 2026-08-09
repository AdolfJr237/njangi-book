import { darkColors, lightColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * The one hook every screen uses for colors: `const { colors } = useTheme();`
 * useColorScheme() reads the phone's system light/dark setting -- we don't
 * store a preference or ask the user, it just follows the OS automatically,
 * the same way the HomeEasy app does it.
 */
export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return {
    colors: isDark ? darkColors : lightColors,
    isDark,
  };
}
