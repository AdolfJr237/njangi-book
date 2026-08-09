import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type GroupCardProps = {
  name: string;
  collectorName: string;
  contributionAmount: number;
  nextDueDate: string;
  onPress?: () => void;
};

export function GroupCard({
  name,
  collectorName,
  contributionAmount,
  nextDueDate,
  onPress,
}: GroupCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.titleRow}>
        <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </View>
      <Text style={[styles.collector, { color: colors.textSecondary }]}>
        Collector: {collectorName}
      </Text>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.footerRow}>
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Your contribution</Text>
          <Text style={[styles.amount, { color: colors.text }]}>
            {contributionAmount.toLocaleString()} XAF
          </Text>
        </View>
        <View style={styles.dueColumn}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Next due</Text>
          <Text style={[styles.dueDate, { color: colors.danger }]}>{nextDueDate}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.bold,
  },
  collector: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.regular,
    marginTop: Spacing.xs,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dueColumn: {
    alignItems: 'flex-end',
  },
  label: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    marginBottom: Spacing.xs,
  },
  amount: {
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.bold,
  },
  dueDate: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.semibold,
  },
});
