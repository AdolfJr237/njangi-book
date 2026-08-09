import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { changePassword } from '@/services/authApi';
import { ApiError } from '@/services/apiClient';
import { validatePasswordMatch, validateRequired } from '@/utils/validation';

type FieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export default function ChangePasswordScreen() {
  const { colors } = useTheme();
  const { token, updateSession } = useAuth();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live, not on-blur -- the strength rule updates with every keystroke
  // so the user sees themselves satisfy it in real time, per the UX
  // doc's "validate as the user types" standard. This is the ONLY rule
  // the backend actually enforces (min 8 characters), so that's the
  // only thing shown here -- nothing implied that isn't really checked.
  const meetsLength = newPassword.length >= 8;

  const goBackToProfile = () => {
    if (groupId) {
      router.replace({ pathname: '/group/[groupId]/more', params: { groupId } });
    } else {
      router.back();
    }
  };

  const validateField = (field: keyof FieldErrors) => {
    const validators: Record<keyof FieldErrors, () => string | null> = {
      currentPassword: () => validateRequired(currentPassword, 'Current password'),
      newPassword: () => (meetsLength ? null : 'Password must be at least 8 characters'),
      confirmPassword: () => validatePasswordMatch(newPassword, confirmPassword),
    };
    const message = validators[field]();
    setFieldErrors((prev) => ({ ...prev, [field]: message ?? undefined }));
    return message === null;
  };

  const handleSubmit = async () => {
    const currentValid = validateField('currentPassword');
    const newValid = validateField('newPassword');
    const confirmValid = validateField('confirmPassword');
    if (!currentValid || !newValid || !confirmValid || !token) return;

    setFormError(null);
    setIsSubmitting(true);
    try {
      const result = await changePassword(currentPassword, newPassword, token);
      // The backend just invalidated every token for this account,
      // including the one this request used -- swap in the fresh one
      // immediately so this device stays logged in without a re-login.
      await updateSession(result.access_token, result.user);

      Alert.alert('Password changed', 'Your password has been updated successfully.', [
        { text: 'OK', onPress: goBackToProfile },
      ]);
    } catch (error) {
      if (error instanceof ApiError && error.message === 'Current password is incorrect') {
        // Specific field-level error, not a generic banner -- exactly
        // what the UX doc asks for, and it's the one wrong-input case
        // that's genuinely about a particular field rather than the
        // request as a whole.
        setFieldErrors((prev) => ({ ...prev, currentPassword: error.message }));
      } else {
        setFormError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader title="Change Password" onBack={goBackToProfile} />

      <SafeAreaView edges={['bottom']} style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Input
              label="Current Password"
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text);
                if (fieldErrors.currentPassword) {
                  setFieldErrors((prev) => ({ ...prev, currentPassword: undefined }));
                }
              }}
              onBlur={() => validateField('currentPassword')}
              error={fieldErrors.currentPassword}
              placeholder="Enter your current password"
              secureTextEntry
            />

            <Input
              label="New Password"
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (fieldErrors.newPassword) setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
              }}
              onBlur={() => validateField('newPassword')}
              error={fieldErrors.newPassword}
              placeholder="Create a new password"
              secureTextEntry
            />
            <View style={styles.strengthRow}>
              <Ionicons
                name={meetsLength ? 'checkmark-circle' : 'ellipse-outline'}
                size={14}
                color={meetsLength ? colors.success : colors.textSecondary}
              />
              <Text style={[styles.strengthText, { color: meetsLength ? colors.success : colors.textSecondary }]}>
                At least 8 characters
              </Text>
            </View>

            <Input
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }
              }}
              onBlur={() => validateField('confirmPassword')}
              error={fieldErrors.confirmPassword}
              placeholder="Re-enter your new password"
              secureTextEntry
            />

            {formError && <Banner message={formError} tone="danger" />}

            <View style={styles.spacer} />

            <Button
              label="Update Password"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
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
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: -Spacing.md,
    marginBottom: Spacing.xl,
  },
  strengthText: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
  },
  spacer: {
    flex: 1,
    minHeight: Spacing.xl,
  },
});
