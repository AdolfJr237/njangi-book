import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type PillProps = {
  label: string;
  tone: 'success' | 'danger' | 'warning';
};

/**
 * Generic colored status badge -- green/red/amber, per CLAUDE.md's rule
 * that these three colors are reserved for money states. Started as a
 * Contributions-only "Paid/Owing" component, generalized once Loans
 * needed a third state (Active/Overdue/Repaid) rather than write a
 * near-duplicate pill component per feature.
 */
export function Pill({ label, tone }: PillProps) {
  const { colors } = useTheme();
  const color = { success: colors.success, danger: colors.danger, warning: colors.warning }[tone];

  return (
    <View style={[styles.pill, { backgroundColor: `${color}1A` }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  label: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.semibold,
  },
});
