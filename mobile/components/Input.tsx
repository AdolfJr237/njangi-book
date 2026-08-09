import { useState } from 'react';
import {
  KeyboardTypeOptions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type InputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  editable?: boolean;
  /** Inline validation message (UX standard #6: validate on blur/type,
   * name exactly what's wrong). When set, the field border and this
   * text both turn red. Pass undefined/'' to clear it. */
  error?: string;
  onBlur?: () => void;
  /** iOS's one-tap "security code" QuickType suggestion -- set only on
   * an OTP field. Undefined everywhere else, no behavior change. */
  textContentType?: 'oneTimeCode';
  /** Android's equivalent SMS-autofill hint. */
  autoComplete?: 'sms-otp';
};

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  multiline = false,
  editable = true,
  error,
  onBlur,
  textContentType,
  autoComplete,
}: InputProps) {
  const { colors } = useTheme();
  // Only relevant when secureTextEntry is passed -- tracks whether the
  // user has tapped the eye icon to reveal their password.
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View
        style={[
          styles.fieldRow,
          multiline && styles.fieldRowMultiline,
          { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border },
          !editable && styles.fieldRowDisabled,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={secureTextEntry && !isRevealed}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          editable={editable}
          textContentType={textContentType}
          autoComplete={autoComplete}
          style={[styles.input, multiline && styles.inputMultiline, { color: colors.text }]}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setIsRevealed((prev) => !prev)} hitSlop={8}>
            <Ionicons
              name={isRevealed ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
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
  fieldRowMultiline: {
    height: 96,
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
  },
  fieldRowDisabled: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontSize: Typography.size.md,
    fontFamily: Typography.family.regular,
  },
  inputMultiline: {
    height: '100%',
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    marginTop: Spacing.xs,
  },
});
