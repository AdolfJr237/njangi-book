import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type SegmentedChipsProps = {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
};

/** Single-select pill group -- selected option is a filled navy pill,
 * the rest are outlined. Used for Meeting Frequency now; reusable later
 * for any small fixed-choice field (room type, fine status filter, etc). */
export function SegmentedChips({ options, value, onChange }: SegmentedChipsProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? colors.primary : 'transparent',
                borderColor: colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: isSelected ? colors.white : colors.primary },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    flex: 1,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.semibold,
  },
});
