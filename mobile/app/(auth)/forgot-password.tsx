import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { PhoneInput } from '@/components/PhoneInput';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { ApiError } from '@/services/apiClient';
import {
  clearFirebasePhoneSession,
  confirmFirebasePhoneCode,
  prepareFirebasePhoneVerification,
  sendFirebasePhoneCode,
} from '@/services/firebasePhoneAuth';
import { resetPasswordWithFirebase } from '@/services/passwordResetApi';
import {
  normalizePhoneNumber,
  validateOtpCode,
  validatePassword,
  validatePasswordMatch,
  validatePhoneNumber,
} from '@/utils/validation';

// Firebase verifies the SMS code on the device, then FastAPI verifies the
// resulting signed Firebase token before it changes the password.
type Step = 'phone' | 'reset';
const STEPS: { key: Step; label: string }[] = [
  { key: 'phone', label: 'Phone' },
  { key: 'reset', label: 'Verify & Reset' },
];

const RESEND_COOLDOWN_SECONDS = 60; // matches the backend's own cooldown

type FieldErrors = {
  phoneNumber?: string;
  code?: string;
  newPassword?: string;
  confirmPassword?: string;
};

function getPhoneVerificationError(error: unknown): string {
  if (error instanceof ApiError) return error.message;

  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  if (code === 'auth/invalid-phone-number') return 'Enter a valid Cameroon phone number.';
  if (code === 'auth/unauthorized-domain') {
    return 'Phone verification must run from the authorised NjangiBook web domain.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Firebase Phone sign-in is not enabled for this project.';
  }
  if (code === 'auth/captcha-check-failed') {
    return 'Firebase could not complete its anti-abuse check. Refresh and try again.';
  }
  if (code === 'auth/invalid-verification-code') return 'That verification code is incorrect.';
  if (code === 'auth/code-expired' || code === 'auth/session-expired') {
    return 'This code has expired. Request a new one.';
  }
  if (code === 'auth/too-many-requests' || code === 'auth/quota-exceeded') {
    return 'Too many verification attempts. Please wait and try again later.';
  }
  if (error instanceof Error && error.message === 'Request a verification code first.') {
    return error.message;
  }
  if (error instanceof Error && error.message.includes('development build')) {
    return error.message;
  }
  return 'Could not verify this phone number. Check your connection and try again.';
}

export default function ForgotPassword() {
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('phone');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  // Ticks resendCountdown down to 0, one second at a time. Only runs
  // while there's actually time left, so it's inert on the phone step.
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  useEffect(() => {
    // On web this mounts Firebase's invisible reCAPTCHA abuse check. Native
    // Android is a no-op because Firebase uses its native app verification.
    prepareFirebasePhoneVerification().catch(() => {
      // The action handler shows a human-readable error if setup is still not
      // available. Keeping this quiet avoids an error banner before the user
      // has even entered a phone number.
    });
  }, []);

  const validateField = (field: keyof FieldErrors) => {
    const validators = {
      phoneNumber: () => validatePhoneNumber(phoneNumber),
      code: () => validateOtpCode(code),
      newPassword: () => validatePassword(newPassword),
      confirmPassword: () => validatePasswordMatch(newPassword, confirmPassword),
    };
    const message = validators[field]();
    setFieldErrors((prev) => ({ ...prev, [field]: message ?? undefined }));
    return message === null;
  };

  const handleBack = () => {
    if (step === 'phone') {
      router.back();
      return;
    }
    setStep('phone');
    setFormError(null);
    setSuccessMessage(null);
  };

  const handleSendCode = async () => {
    if (!validateField('phoneNumber')) return;

    setFormError(null);
    setIsSendingCode(true);
    try {
      await sendFirebasePhoneCode(normalizePhoneNumber(phoneNumber));
      setStep('reset');
      setResendCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setFormError(getPhoneVerificationError(error));
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCountdown > 0) return;

    setFormError(null);
    setIsResending(true);
    try {
      await sendFirebasePhoneCode(normalizePhoneNumber(phoneNumber));
      setResendCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setFormError(getPhoneVerificationError(error));
    } finally {
      setIsResending(false);
    }
  };

  const handleReset = async () => {
    const codeValid = validateField('code');
    const passwordValid = validateField('newPassword');
    const confirmValid = validateField('confirmPassword');
    if (!codeValid || !passwordValid || !confirmValid) return;

    setFormError(null);
    setIsResetting(true);
    try {
      const firebaseIdToken = await confirmFirebasePhoneCode(code);
      await resetPasswordWithFirebase(firebaseIdToken, newPassword);
      await clearFirebasePhoneSession();
      setSuccessMessage('Password reset successfully.');
    } catch (error) {
      setFormError(getPhoneVerificationError(error));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader title="Reset Password" onBack={handleBack} />

      <View style={[styles.stepTabsRow, { borderBottomColor: colors.border }]}>
        {STEPS.map((item, index) => (
          <View key={item.key} style={styles.stepTab}>
            <Text
              style={[
                styles.stepTabLabel,
                { color: index === stepIndex ? colors.primary : colors.textSecondary },
              ]}
            >
              {item.label}
            </Text>
            {index === stepIndex && (
              <View style={[styles.stepTabUnderline, { backgroundColor: colors.primary }]} />
            )}
          </View>
        ))}
      </View>

      <SafeAreaView edges={['bottom']} style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {Platform.OS === 'web' && <View nativeID="firebase-recaptcha-container" style={styles.recaptcha} />}
            {step === 'phone' && (
              <>
                <Text style={[styles.heading, { color: colors.text }]}>Enter your phone number</Text>
                <Text style={[styles.subheading, { color: colors.textSecondary }]}>
                  We&apos;ll text a 6-digit code to verify it&apos;s you.
                </Text>
                <PhoneInput
                  label="Phone Number"
                  value={phoneNumber}
                  onChangeText={(text) => {
                    setPhoneNumber(text);
                    if (fieldErrors.phoneNumber) setFieldErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                  }}
                  onBlur={() => validateField('phoneNumber')}
                  error={fieldErrors.phoneNumber}
                />

                {formError && <Banner message={formError} tone="danger" />}

                <View style={styles.spacer} />
                <Button
                  label="Send Code"
                  onPress={handleSendCode}
                  loading={isSendingCode}
                  disabled={isSendingCode}
                />
              </>
            )}

            {step === 'reset' && !successMessage && (
              <>
                <Text style={[styles.heading, { color: colors.text }]}>Verify & reset</Text>
                <Text style={[styles.subheading, { color: colors.textSecondary }]}>
                  Enter the 6-digit code sent to +237{phoneNumber || '...'}, then choose a new
                  password.
                </Text>

                <Input
                  label="Verification Code"
                  value={code}
                  onChangeText={(text) => {
                    setCode(text.replace(/\D/g, '').slice(0, 6));
                    if (fieldErrors.code) setFieldErrors((prev) => ({ ...prev, code: undefined }));
                  }}
                  onBlur={() => validateField('code')}
                  error={fieldErrors.code}
                  placeholder="123456"
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                />

                <Pressable
                  onPress={handleResendCode}
                  disabled={resendCountdown > 0 || isResending}
                  hitSlop={8}
                  style={styles.resendRow}
                >
                  <Text
                    style={[
                      styles.resendText,
                      { color: resendCountdown > 0 ? colors.textSecondary : colors.primary },
                    ]}
                  >
                    {isResending
                      ? 'Resending...'
                      : resendCountdown > 0
                        ? `Resend code in ${resendCountdown}s`
                        : 'Resend code'}
                  </Text>
                </Pressable>

                <Input
                  label="New Password"
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    if (fieldErrors.newPassword) setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
                  }}
                  onBlur={() => validateField('newPassword')}
                  error={fieldErrors.newPassword}
                  placeholder="Create a strong password"
                  secureTextEntry
                />
                <Input
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (fieldErrors.confirmPassword)
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  onBlur={() => validateField('confirmPassword')}
                  error={fieldErrors.confirmPassword}
                  placeholder="Re-enter your password"
                  secureTextEntry
                />

                {formError && <Banner message={formError} tone="danger" />}

                <View style={styles.spacer} />
                <Button
                  label="Reset Password"
                  onPress={handleReset}
                  loading={isResetting}
                  disabled={isResetting}
                />
              </>
            )}

            {step === 'reset' && successMessage && (
              <View style={styles.successBlock}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                <Text style={[styles.heading, { color: colors.text }]}>Password reset</Text>
                <Text style={[styles.subheading, { color: colors.textSecondary }]}>
                  {successMessage} Log in with your new password.
                </Text>
                <Button label="Go to Login" onPress={() => router.replace('/(auth)/login')} style={styles.goToLoginButton} />
              </View>
            )}
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
  stepTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  stepTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  stepTabLabel: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.semibold,
  },
  stepTabUnderline: {
    marginTop: Spacing.sm,
    height: 2,
    width: '60%',
    borderRadius: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
  },
  recaptcha: {
    height: 1,
    overflow: 'hidden',
  },
  heading: {
    fontSize: Typography.size.xl,
    fontFamily: Typography.family.bold,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subheading: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.regular,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },
  resendRow: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: -Spacing.md,
  },
  resendText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.semibold,
  },
  spacer: {
    flex: 1,
    minHeight: Spacing.xxl,
  },
  successBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  goToLoginButton: {
    width: '100%',
    marginTop: Spacing.xl,
  },
});
