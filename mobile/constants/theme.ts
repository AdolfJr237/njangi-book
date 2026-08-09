/**
 * NjangiBook's design system: solid navy and white, financial-tool feel,
 * not playful. Status colors (green/red/amber) are reserved ONLY for
 * money states -- paid/unpaid/pending -- so they keep meaning instead
 * of turning into decoration.
 *
 * lightColors and darkColors share identical keys on purpose. Every
 * screen reads colors through useTheme() (hooks/useTheme.ts) instead of
 * touching this file directly, so the app automatically follows the
 * system's light/dark setting, and a palette tweak is a one-file edit.
 *
 * primary is brighter in dark mode -- the base navy (#16244C) is almost
 * as dark as the dark background itself, so it would nearly disappear
 * on buttons and active states without lightening it.
 */

import { Platform } from 'react-native';

export const lightColors = {
  primary: '#16244C',
  primaryLight: '#2A3F72',
  background: '#FFFFFF',
  surface: '#F4F6FA',
  card: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  black: '#000000',

  success: '#1E9E5A', // paid / positive
  danger: '#D64545', // unpaid / overdue
  warning: '#E0A100', // pending / due soon
};

export const darkColors = {
  primary: '#4C6FA5',
  primaryLight: '#6483BD',
  background: '#0B1220',
  surface: '#141B2E',
  card: '#141B2E',
  text: '#F4F6FA',
  textSecondary: '#9BA3B4',
  border: '#26314A',
  white: '#FFFFFF',
  black: '#000000',

  success: '#1E9E5A',
  danger: '#D64545',
  warning: '#E0A100',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  sm: 10,
  md: 14,
  card: 16,
  lg: 20,
  full: 999,
};

export const Typography = {
  size: { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, display: 30 },
  // These map to the exact font files loaded in app/_layout.tsx via
  // @expo-google-fonts/inter. With a custom TTF, the *file* is the
  // weight -- setting `fontWeight` on top of it can make some platforms
  // apply fake/double bolding, so every Text style should set
  // `fontFamily` to one of these instead of using `fontWeight` at all.
  family: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    rounded: 'ui-rounded',
  },
  default: {
    sans: 'normal',
    rounded: 'normal',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
  },
});
