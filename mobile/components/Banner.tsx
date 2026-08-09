import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type BannerProps = {
  message: string;
  tone?: 'warning' | 'danger' | 'success';
};

/** Inline notice box -- tinted background + icon + text. Used for
 * "this action notifies someone" style warnings before a save action. */
export function Banner({ message, tone = 'warning' }: BannerProps) {
  const { colors } = useTheme();
  const color = { warning: colors.warning, danger: colors.danger, success: colors.success }[tone];
  const icon = tone === 'success' ? 'checkmark-circle' : 'warning';

  return (
    <View style={[styles.container, { backgroundColor: `${color}1A` }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.message, { color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  message: {
    flex: 1,
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    lineHeight: 18,
  },
});
