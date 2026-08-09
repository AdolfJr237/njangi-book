import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ComingSoon } from '@/components/ComingSoon';
import { CustomTabBar } from '@/components/CustomTabBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTheme } from '@/hooks/useTheme';

// This screen doubles as the Funds tab's landing page -- no separate
// hub mockup exists, and it's the screen shown whenever Funds is active
// in the Figma reference, so it IS the Funds tab. Category B: the
// Welfare backend doesn't exist yet, so this stays a clean placeholder
// rather than wired-up mock data.
export default function WelfareFund() {
  const { colors } = useTheme();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader title="Welfare Fund" onBack={() => router.replace('/(app)/dashboard')} />

      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ComingSoon
          icon="wallet-outline"
          title="Welfare Fund coming soon"
          message="Track welfare contributions and payouts here once this feature is built."
        />
      </SafeAreaView>
      <CustomTabBar groupId={groupId ?? ''} activeTab="funds" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
