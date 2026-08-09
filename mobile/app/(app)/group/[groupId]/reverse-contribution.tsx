import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { ApiError } from '@/services/apiClient';
import { reverseContribution } from '@/services/contributionsApi';

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

type ReverseContributionParams = {
  groupId: string;
  contributionId: string;
  memberName: string;
  amount: string;
  paidDate: string;
};

// A correction, not an edit -- reversing never touches the original
// row. It adds a second entry that cancels the first, and both stay
// permanently visible in the ledger. If a correct entry is then
// needed, that's a separate, ordinary Record Contribution afterward.
export default function ReverseContribution() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const { groupId, contributionId, memberName, amount, paidDate } =
    useLocalSearchParams<ReverseContributionParams>();

  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const confirmReverse = () => {
    Alert.alert(
      'Reverse this contribution?',
      `${memberName} will go back to owing for this cycle. This can't be undone -- if a correct entry is needed afterward, record it separately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reverse', style: 'destructive', onPress: handleReverse },
      ]
    );
  };

  const handleReverse = async () => {
    if (!token || !groupId || !contributionId) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await reverseContribution(groupId, Number(contributionId), token, reason.trim());
      // Back to the Ledger, which reloads on focus and shows both the
      // original (now marked reversed) and this correction immediately.
      router.back();
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader title="Reverse Contribution" onBack={() => router.back()} />

      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Member</Text>
            <Text style={[styles.value, { color: colors.text }]}>{memberName}</Text>

            <View style={styles.row}>
              <View style={styles.rowCell}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
                <Text style={[styles.value, { color: colors.text }]}>
                  {Number(amount).toLocaleString()} XAF
                </Text>
              </View>
              <View style={styles.rowCell}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Paid</Text>
                <Text style={[styles.value, { color: colors.text }]}>{formatDate(paidDate)}</Text>
              </View>
            </View>
          </View>

          <Banner message="Reversing adds a correcting entry -- it never edits or deletes the original. Both stay visible in the ledger, and the member goes back to owing for this cycle." />

          <Input
            label="Reason (optional)"
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Recorded wrong member, wrong amount, duplicate entry"
            multiline
          />

          {errorMessage && <Banner message={errorMessage} tone="danger" />}

          <View style={styles.spacer} />

          <Button
            label="Reverse Contribution"
            onPress={confirmReverse}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.button}
          />
          <Button label="Cancel" variant="outline" onPress={() => router.back()} style={styles.button} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
  },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.xl,
  },
  rowCell: {
    flex: 1,
  },
  label: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    marginBottom: Spacing.xs,
  },
  value: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.semibold,
  },
  spacer: {
    flex: 1,
    minHeight: Spacing.xl,
  },
  button: {
    width: '100%',
    marginBottom: Spacing.md,
  },
});
