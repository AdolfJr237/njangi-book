import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export type SelectOption = {
  value: string;
  label: string;
  subtitle?: string;
  avatarText?: string;
};

type SelectFieldProps = {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
};

/** Tap-to-open picker: shows the selected option, opens a bottom-sheet-
 * style modal list to choose another. Used for "Select Member" and
 * "Meeting" in Record Contribution -- reusable anywhere else a small
 * fixed list needs picking from. */
export function SelectField({ label, options, value, onChange }: SelectFieldProps) {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Pressable
        onPress={() => setIsOpen(true)}
        style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.selectedRow}>
          {selected?.avatarText && (
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{selected.avatarText}</Text>
            </View>
          )}
          <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
            {selected?.label ?? 'Select...'}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setIsOpen(false);
                  }}
                  style={styles.optionRow}
                >
                  {item.avatarText && (
                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                      <Text style={styles.avatarText}>{item.avatarText}</Text>
                    </View>
                  )}
                  <View style={styles.optionTextBlock}>
                    <Text style={[styles.optionLabel, { color: colors.text }]}>{item.label}</Text>
                    {item.subtitle && (
                      <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                        {item.subtitle}
                      </Text>
                    )}
                  </View>
                  {item.value === value && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
    justifyContent: 'space-between',
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  value: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.regular,
    flexShrink: 1,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.bold,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.xl,
    maxHeight: '70%',
  },
  sheetTitle: {
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.bold,
    marginBottom: Spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  optionTextBlock: {
    flex: 1,
  },
  optionLabel: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.semibold,
  },
  optionSubtitle: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    marginTop: 2,
  },
});
