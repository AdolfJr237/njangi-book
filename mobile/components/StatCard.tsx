import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type StatCardProps = {
  label: string;
  value: string;
  valueColor?: string;
  subtext: string;
  showCheckIcon?: boolean;
};

/** One of the two side-by-side cards on Group Home (Welfare Fund / My Standing). */
export function StatCard({ label, value, valueColor, subtext, showCheckIcon }: StatCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: valueColor ?? colors.text }]}>{value}</Text>
      <View style={styles.subtextRow}>
        {showCheckIcon && (
          <Ionicons name="checkmark-circle" size={13} color={colors.success} />
        )}
        <Text style={[styles.subtext, { color: showCheckIcon ? colors.success : colors.textSecondary }]}>
          {subtext}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  label: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    marginBottom: Spacing.sm,
  },
  value: {
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.bold,
    marginBottom: Spacing.xs,
  },
  subtextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subtext: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
  },
});
