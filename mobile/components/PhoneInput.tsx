import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type PhoneInputProps = {
  label: string;
  /** Just the 9 digits after +237 -- the screen never has to think
   * about the country code, and normalizePhoneNumber() in
   * utils/validation.ts still works unchanged on whatever comes out of
   * this (it already strips/re-adds +237 either way). */
  value: string;
  onChangeText: (nineDigits: string) => void;
  onBlur?: () => void;
  error?: string;
};

/** Cameroon numbers are always 9 digits after +237 -- showing that
 * prefix as a fixed, non-editable part of the field (not a placeholder
 * that vanishes on typing) means the user only ever types the part that
 * actually varies. */
export function PhoneInput({ label, value, onChangeText, onBlur, error }: PhoneInputProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View
        style={[
          styles.fieldRow,
          { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border },
        ]}
      >
        <Text style={[styles.prefix, { color: colors.text }]}>+237</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <TextInput
          value={value}
          onChangeText={(text) => onChangeText(text.replace(/\D/g, '').slice(0, 9))}
          onBlur={onBlur}
          placeholder="6XX XXX XXX"
          placeholderTextColor={colors.textSecondary}
          keyboardType="number-pad"
          maxLength={9}
          style={[styles.input, { color: colors.text }]}
        />
      </View>
      {error && <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>}
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
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  prefix: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.semibold,
  },
  divider: {
    width: 1,
    height: 20,
    marginHorizontal: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: Typography.size.md,
    fontFamily: Typography.family.regular,
  },
  errorText: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    marginTop: Spacing.xs,
  },
});
