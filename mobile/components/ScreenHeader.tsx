import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightSlot?: ReactNode;
};

/**
 * The solid navy bar used on every "sub-screen" (Forgot Password, Create
 * Group, Join Group, and later most in-group screens). It paints navy
 * behind the status bar itself -- that's why it reads insets.top rather
 * than living inside a SafeAreaView with edges={['top']}, which would
 * leave a plain background gap above it instead of a full-bleed bar.
 * Pair this with <StatusBar style="light" /> on the screen that uses it.
 */
export function ScreenHeader({ title, subtitle, onBack, rightSlot }: ScreenHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.primary, paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.row}>
        <View style={styles.side}>
          {onBack && (
            <Pressable onPress={onBack} hitSlop={8}>
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </Pressable>
          )}
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        <View style={[styles.side, styles.sideRight]}>{rightSlot}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    flex: 1,
    alignItems: 'flex-start',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  titleBlock: {
    flex: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.bold,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    textAlign: 'center',
    marginTop: 2,
  },
});
