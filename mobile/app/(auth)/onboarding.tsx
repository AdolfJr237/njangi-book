import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { PaginationDots } from '@/components/PaginationDots';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { markOnboardingSeen } from '@/services/onboardingStorage';

const { width } = Dimensions.get('window');

// Only slide 1 came from the Figma mockup -- slides 2 and 3 are written
// here to cover the app's other core value props (rotation order, and
// welfare/loans/fines). Tweak the copy freely, this is just a starting
// point.
const SLIDES: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'book-outline',
    title: 'Track every contribution',
    body: 'Record who paid, how much, and when — no more disputes over the notebook.',
  },
  {
    icon: 'sync-outline',
    title: 'Never miss whose turn',
    body: 'See the rotation order at a glance and know exactly who collects the pot next.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Welfare, loans & fines in one place',
    body: "Keep every ledger organized so your group's records are always clear and trusted.",
  },
];

export default function Onboarding() {
  const { colors } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const isLastSlide = activeIndex === SLIDES.length - 1;

  const goToSignup = () => {
    markOnboardingSeen();
    router.replace('/(auth)/signup');
  };

  const handleNext = () => {
    if (isLastSlide) {
      goToSignup();
      return;
    }
    listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.skipRow}>
        <Pressable onPress={goToSignup} hitSlop={8}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
              <Ionicons name={item.icon} size={56} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <PaginationDots total={SLIDES.length} activeIndex={activeIndex} />
        <Button
          label={isLastSlide ? 'Get Started' : 'Next'}
          onPress={handleNext}
          style={styles.button}
        />
        <Button label="Skip to Sign Up" variant="outline" onPress={goToSignup} style={styles.button} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipRow: {
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  skipText: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.medium,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  iconWrap: {
    width: 140,
    height: 140,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    fontSize: Typography.size.xl,
    fontFamily: Typography.family.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.regular,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  button: {
    width: '100%',
  },
});
