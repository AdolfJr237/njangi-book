import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ComingSoon } from '@/components/ComingSoon';
import { CustomTabBar } from '@/components/CustomTabBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTheme } from '@/hooks/useTheme';

// Category B: Loans has no backend yet, so this stays a clean
// placeholder. Reached from Group Home's "Active Loans" quick action.
export default function Loans() {
  const { colors } = useTheme();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader title="Loans" onBack={() => router.back()} />

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
