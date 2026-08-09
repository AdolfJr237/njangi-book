import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type InviteCodeCardProps = {
  code: string;
  label?: string;
};

/** The invite code display + copy button, shared between Create Group's
 * success screen and the More tab (where a treasurer needs to find the
 * code again after that first reveal is gone). */
export function InviteCodeCard({ code, label = 'Invite Code' }: InviteCodeCardProps) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.row}>
        <View style={[styles.codeBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.code, { color: colors.text }]}>{code}</Text>
        </View>
        <Pressable
          onPress={handleCopy}
          style={[styles.copyButton, { backgroundColor: copied ? colors.success : colors.primary }]}
        >
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={colors.white} />
          <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
        </Pressable>
      </View>
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
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  codeBox: {
    flex: 1,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  code: {
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.bold,
    letterSpacing: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  copyText: {
    color: '#FFFFFF',
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.semibold,
  },
});
