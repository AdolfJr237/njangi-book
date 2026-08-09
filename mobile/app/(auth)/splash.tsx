import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { Spacing, Typography, lightColors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { hasSeenOnboarding } from '@/services/onboardingStorage';

// Splash is a brand moment, not a "content" screen -- like HomeEasy's
// Welcome screen, it stays a fixed navy regardless of the system's
// light/dark setting, so it always matches the app icon and store
// listing. That's why this file reads lightColors.primary directly
// instead of going through useTheme().
const NAVY = lightColors.primary;

function LoadingDots() {
  const values = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    const animations = values.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 150),
          Animated.timing(value, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0.3, duration: 350, useNativeDriver: true }),
        ])
      )
    );
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [values]);

  return (
    <View style={styles.dotsRow}>
      {values.map((value, index) => (
        <Animated.View key={index} style={[styles.dot, { opacity: value }]} />
      ))}
    </View>
  );
}

export default function Splash() {
  const { isInitializing, user } = useAuth();
  // A real check (reading storage, maybe a network call to validate
  // the token) can resolve in a few milliseconds when there's no
  // stored session -- without a floor, the brand screen would flash by
  // too fast to read. This guarantees Splash shows for at least 1s,
  // but never longer than the real check actually takes.
  const [minDelayElapsed, setMinDelayElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinDelayElapsed(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isInitializing || !minDelayElapsed) return;

    (async () => {
      if (user) {
        router.replace('/(app)/dashboard');
        return;
      }
      const seenOnboarding = await hasSeenOnboarding();
      router.replace(seenOnboarding ? '/(auth)/login' : '/(auth)/onboarding');
    })();
  }, [isInitializing, minDelayElapsed, user]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.center}>
        <Logo size={96} variant="onDark" />
        <Text style={styles.title}>NjangiBook</Text>
        <Text style={styles.tagline}>Smart savings. Trusted records.</Text>
      </View>
      <View style={styles.footer}>
        <LoadingDots />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAVY,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  title: {
    color: '#FFFFFF',
    fontSize: Typography.size.xxl,
    fontFamily: Typography.family.bold,
  },
  tagline: {
    color: '#AAB4CC',
    fontSize: Typography.size.sm,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    color: '#AAB4CC',
    fontSize: Typography.size.sm,
  },
});
