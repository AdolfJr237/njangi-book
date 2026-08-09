import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ComingSoon } from '@/components/ComingSoon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTheme } from '@/hooks/useTheme';

// Category B: no longer reachable from Welfare Fund (its FAB is gone
// now that Welfare Fund itself is a placeholder), kept as its own clean
// placeholder in case anything still deep-links here rather than left
// as a fake form.
export default function RecordWelfareEntry() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader title="Record Welfare Entry" onBack={() => router.back()} />

      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ComingSoon
          icon="wallet-outline"
          title="Welfare Fund coming soon"
          message="Track welfare contributions and payouts here once this feature is built."
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
