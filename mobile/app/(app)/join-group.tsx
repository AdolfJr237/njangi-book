import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { ApiError } from '@/services/apiClient';
import { joinGroup } from '@/services/groupsApi';

export default function JoinGroup() {
  const { colors } = useTheme();
  const { token } = useAuth();

  const [inviteCode, setInviteCode] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoin = async () => {
    if (inviteCode.trim().length === 0) {
      setFieldError('Enter an invite code');
      return;
    }
    if (!token) return;

    setFieldError(undefined);
    setIsSubmitting(true);
    try {
      const group = await joinGroup(inviteCode.trim(), token);
      router.replace({ pathname: '/group/[groupId]/home', params: { groupId: String(group.id) } });
    } catch (error) {
      // The backend's own message ("Invalid invite code" / "You're
      // already a member of this group") is specific enough to show
      // directly -- exactly the UX doc's "name exactly what's wrong"
      // rule, right under the field the problem is about.
      setFieldError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader title="Join a Group" onBack={() => router.back()} />

      <SafeAreaView edges={['bottom']} style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.iconWrap}>
              <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
                <Ionicons name="qr-code-outline" size={40} color={colors.primary} />
              </View>
            </View>

            <Text style={[styles.heading, { color: colors.text }]}>Enter invite code</Text>
            <Text style={[styles.subheading, { color: colors.textSecondary }]}>
              Ask your group treasurer for the invite code to join.
            </Text>

            <Input
              label="Invite Code"
              value={inviteCode}
              onChangeText={(text) => {
                setInviteCode(text.toUpperCase());
                if (fieldError) setFieldError(undefined);
              }}
              error={fieldError}
              placeholder="e.g. FBR-7X4K"
              autoCapitalize="characters"
            />

            <View style={styles.spacer} />

            <Button
              label="Join Group"
              onPress={handleJoin}
              loading={isSubmitting}
              disabled={isSubmitting}
              style={styles.button}
            />

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <Button
              label="+  Create a New Group"
              variant="outline"
              onPress={() => router.replace('/(app)/create-group')}
              disabled={isSubmitting}
              style={styles.button}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: Spacing.xxl,
  },
  iconBox: {
    width: 88,
    height: 88,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: Typography.size.xl,
    fontFamily: Typography.family.bold,
    marginBottom: Spacing.xs,
  },
  subheading: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.regular,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },
  spacer: {
    flex: 1,
    minHeight: Spacing.xxl,
  },
  button: {
    width: '100%',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: Spacing.lg,
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.regular,
  },
});
