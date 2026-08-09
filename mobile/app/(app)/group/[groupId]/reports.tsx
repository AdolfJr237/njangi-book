import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ComingSoon } from '@/components/ComingSoon';
import { CustomTabBar } from '@/components/CustomTabBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTheme } from '@/hooks/useTheme';

// Category B: Reports has no backend yet, so this stays a clean
// placeholder rather than the fabricated year-end summary + fake
// Premium upsell that used to live here.
export default function Reports() {
  const { colors } = useTheme();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader title="Reports" onBack={() => router.back()} />

      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ComingSoon
          icon="bar-chart-outline"
          title="Reports coming soon"
          message="Year-end summaries and exports will show up here once this feature is built."
        />
      </SafeAreaView>
      <CustomTabBar groupId={groupId ?? ''} activeTab="more" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
