import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ComingSoon } from '@/components/ComingSoon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTheme } from '@/hooks/useTheme';

// Category B: no longer reachable from Fines (its FAB is gone now that
// Fines itself is a placeholder), kept as its own clean placeholder in
// case anything still deep-links here rather than left as a fake form.
export default function AddFine() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader title="Add Fine" onBack={() => router.back()} />

      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ComingSoon
          icon="alert-circle-outline"
          title="Fines coming soon"
          message="Issue and track member fines here once this feature is built."
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
