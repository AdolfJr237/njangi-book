import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Logo } from '@/components/Logo';
import { PhoneInput } from '@/components/PhoneInput';
import { Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { ApiError } from '@/services/apiClient';
import { normalizePhoneNumber, validateFullName, validatePassword, validatePhoneNumber } from '@/utils/validation';

type FieldErrors = {
  fullName?: string;
  phoneNumber?: string;
  password?: string;
};

export default function Signup() {
  const { colors } = useTheme();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = (field: keyof FieldErrors) => {
    const validators = {
      fullName: () => validateFullName(fullName),
      phoneNumber: () => validatePhoneNumber(phoneNumber),
      password: () => validatePassword(password),
    };
    const message = validators[field]();
    setFieldErrors((prev) => ({ ...prev, [field]: message ?? undefined }));
    return message === null;
  };

  const handleCreateAccount = async () => {
    // Re-run every validator on submit too -- a field the user never
    // blurred (e.g. they tabbed straight to the button) still needs
    // checking, not just the ones that already showed an inline error.
    const fullNameValid = validateField('fullName');
    const phoneValid = validateField('phoneNumber');
    const passwordValid = validateField('password');
    if (!fullNameValid || !phoneValid || !passwordValid) return;

    setFormError(null);
    setIsSubmitting(true);
    try {
      await signUp(fullName.trim(), normalizePhoneNumber(phoneNumber), password);
      router.replace('/(app)/dashboard');
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <Logo size={32} variant="onLight" />
            <Text style={[styles.brandText, { color: colors.primary }]}>NjangiBook</Text>
          </View>

          <Text style={[styles.heading, { color: colors.text }]}>Create your account</Text>
          <Text style={[styles.subheading, { color: colors.textSecondary }]}>
            Your phone number is your identity
          </Text>

          <View style={styles.form}>
            <Input
              label="Full Name"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
              }}
              onBlur={() => validateField('fullName')}
              error={fieldErrors.fullName}
              placeholder="e.g. Marie Fogue"
              autoCapitalize="words"
            />
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
            <Input
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              onBlur={() => validateField('password')}
              error={fieldErrors.password}
              placeholder="Create a strong password"
              secureTextEntry
            />
          </View>

          {formError && <Banner message={formError} tone="danger" />}

          <View style={styles.spacer} />

          <Button
            label="Create Account"
            onPress={handleCreateAccount}
            loading={isSubmitting}
            disabled={isSubmitting}
          />

          <View style={styles.footerRow}>
            <Text style={{ color: colors.textSecondary, fontFamily: Typography.family.regular }}>
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable hitSlop={8}>
                <Text style={[styles.link, { color: colors.primary }]}>Log in</Text>
              </Pressable>
            </Link>
          </View>

          <Text style={[styles.fineprint, { color: colors.textSecondary }]}>
            By continuing you agree to NjangiBook&apos;s Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xxxl,
  },
  brandText: {
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.bold,
  },
  heading: {
    fontSize: Typography.size.display,
    fontFamily: Typography.family.bold,
    marginBottom: Spacing.xs,
  },
  subheading: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.regular,
    marginBottom: Spacing.xxxl,
  },
  form: {
    marginBottom: 0,
  },
  // Absorbs the leftover scroll height so the button/footer/fine-print
  // cluster sits near the bottom of the screen, matching the Figma
  // reference, instead of clumping right under the last input field.
  spacer: {
    flex: 1,
    minHeight: Spacing.xxl,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  link: {
    fontFamily: Typography.family.semibold,
  },
  fineprint: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    textAlign: 'center',
    marginTop: Spacing.xxl,
    lineHeight: 16,
  },
});
