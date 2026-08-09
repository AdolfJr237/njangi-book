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
import { normalizePhoneNumber, validatePhoneNumber, validateRequired } from '@/utils/validation';

type FieldErrors = {
  phoneNumber?: string;
  password?: string;
};

export default function Login() {
  const { colors } = useTheme();
  const { signIn } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = (field: keyof FieldErrors) => {
    const validators = {
      phoneNumber: () => validatePhoneNumber(phoneNumber),
      password: () => validateRequired(password, 'Password'),
    };
    const message = validators[field]();
    setFieldErrors((prev) => ({ ...prev, [field]: message ?? undefined }));
    return message === null;
  };

  const handleLogin = async () => {
    const phoneValid = validateField('phoneNumber');
    const passwordValid = validateField('password');
    if (!phoneValid || !passwordValid) return;

    setFormError(null);
    setIsSubmitting(true);
    try {
      await signIn(normalizePhoneNumber(phoneNumber), password);
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

          <Text style={[styles.heading, { color: colors.text }]}>Welcome back</Text>
          <Text style={[styles.subheading, { color: colors.textSecondary }]}>
            Log in to your account
          </Text>

          <View style={styles.form}>
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
              placeholder="Enter your password"
              secureTextEntry
            />
          </View>

          <Link href="/(auth)/forgot-password" asChild>
            <Pressable hitSlop={8} style={styles.forgotRow}>
              <Text style={[styles.link, { color: colors.primary }]}>Forgot password?</Text>
            </Pressable>
          </Link>

          {formError && <Banner message={formError} tone="danger" />}

          <View style={styles.spacer} />

          <Button
            label="Log In"
            onPress={handleLogin}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.loginButton}
          />

          <View style={styles.footerRow}>
            <Text style={{ color: colors.textSecondary, fontFamily: Typography.family.regular }}>
              New to NjangiBook?{' '}
            </Text>
            <Link href="/(auth)/signup" asChild>
              <Pressable hitSlop={8}>
                <Text style={[styles.link, { color: colors.primary }]}>Sign up</Text>
              </Pressable>
            </Link>
          </View>
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
  forgotRow: {
    alignItems: 'flex-end',
  },
  // Absorbs leftover scroll height so Log In + the footer link sit near
  // the bottom of the screen, matching the Figma reference.
  spacer: {
    flex: 1,
    minHeight: Spacing.xxl,
  },
  loginButton: {
    marginTop: 0,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  link: {
    fontFamily: Typography.family.semibold,
  },
});
