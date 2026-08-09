import { StyleSheet, Text, View } from 'react-native';

import { Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type LogoProps = {
  size?: number;
  /** Which background this mark sits on -- decides which way the colors invert.
   * 'onDark': light box + dark letter (used on the navy Splash background).
   * 'onLight': navy box + white letter (used on white screen headers). */
  variant?: 'onDark' | 'onLight';
};

/** The "N" square mark. Just the icon -- screens compose their own
 * wordmark text next to or below it, since that layout differs per screen. */
export function Logo({ size = 40, variant = 'onLight' }: LogoProps) {
  const { colors } = useTheme();
  const isOnDark = variant === 'onDark';

  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: isOnDark ? colors.white : colors.primary,
        },
      ]}
    >
      <Text
        style={{
          color: isOnDark ? colors.primary : colors.white,
          fontSize: size * 0.45,
          fontFamily: Typography.family.bold,
        }}
      >
        N
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
