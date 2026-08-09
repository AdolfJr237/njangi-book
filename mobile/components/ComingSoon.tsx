import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type ComingSoonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
};

/**
 * Body content for a Category B feature whose backend doesn't exist
 * yet. Swaps in for the real content while the screen keeps its own
 * ScreenHeader and CustomTabBar, so back navigation and tab switching
 * still work -- this isn't a whole-screen replacement.
 */
export function ComingSoon({ icon, title, message }: ComingSoonProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: colors.surface }]}>
        <Ionicons name={icon} size={32} color={colors.textSecondary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.bold,
  },
  message: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
});
