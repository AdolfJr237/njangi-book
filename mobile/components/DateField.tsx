import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type DateFieldProps = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
};

function formatDate(date: Date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Tappable field that opens the native date picker. Extracted from
 * Create Group once Record Welfare Entry needed the same thing. */
export function DateField({ label, value, onChange }: DateFieldProps) {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Pressable
        onPress={() => setIsOpen(true)}
        style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
        <Text style={[styles.value, { color: colors.text }]}>{formatDate(value)}</Text>
      </Pressable>
      {isOpen && (
        <DateTimePicker
          value={value}
          mode="date"
          onChange={(_event, selectedDate) => {
            setIsOpen(Platform.OS === 'ios');
            if (selectedDate) onChange(selectedDate);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.semibold,
    marginBottom: Spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  value: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.regular,
  },
});
