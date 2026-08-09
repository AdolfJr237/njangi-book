import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'light';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';
  // 'light': solid white fill + navy text, for a button sitting on top
  // of a navy card (e.g. the Reports premium promo) where 'outline'
  // would be invisible against the matching-color background.
  const isLight = variant === 'light';
  const isDisabled = disabled || loading;

  const backgroundColor = isPrimary ? colors.primary : isLight ? colors.white : 'transparent';
  const textColor = isPrimary ? colors.white : isLight ? colors.primary : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderWidth: isPrimary || isLight ? 0 : 1.5,
          borderColor: colors.primary,
          opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  label: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.semibold,
  },
});
