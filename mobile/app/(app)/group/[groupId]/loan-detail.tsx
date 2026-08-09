import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ComingSoon } from '@/components/ComingSoon';
import { CustomTabBar } from '@/components/CustomTabBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTheme } from '@/hooks/useTheme';

// Category B: no longer reachable from Loans (its list is gone now
// that Loans itself is a placeholder), kept as its own clean
// placeholder in case anything still deep-links here.
export default function LoanDetail() {
  const { colors } = useTheme();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader title="Loan Detail" onBack={() => router.back()} />

      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ComingSoon
          icon="cash-outline"
          title="Loans coming soon"
          message="Request and track member loans here once this feature is built."
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
