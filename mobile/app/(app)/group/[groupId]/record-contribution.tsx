import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SelectField } from '@/components/SelectField';
import { Skeleton } from '@/components/Skeleton';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { ApiError } from '@/services/apiClient';
import { ContributionsLedger, getContributionsLedger, recordContribution } from '@/services/contributionsApi';

function getInitials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

type LoadState = 'loading' | 'error' | 'success';

// No Meeting picker here -- there's only ever one open meeting per
// group right now (cycle advancement isn't built yet), so recording
// always targets the group's current meeting implicitly. No "Mark as
// Paid" toggle either: in the real data model, a Contribution row
// existing IS what "paid" means, there's no separate status to flip.
export default function RecordContribution() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  const [ledger, setLedger] = useState<ContributionsLedger | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedMembershipId, setSelectedMembershipId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadLedger = useCallback(async () => {
    if (!token || !groupId) return;
    setLoadState('loading');
    try {
      const data = await getContributionsLedger(groupId, token);
      setLedger(data);
      const unpaid = data.members.filter((m) => !m.has_paid);
      setSelectedMembershipId(unpaid[0] ? String(unpaid[0].membership_id) : '');
      setLoadState('success');
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
      setLoadState('error');
    }
  }, [token, groupId]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  const handleSave = async () => {
    if (!token || !groupId || !selectedMembershipId) return;

    setFormError(null);
    setIsSubmitting(true);
    try {
      await recordContribution(groupId, Number(selectedMembershipId), token);
      // Back to the Ledger, which reloads on focus and shows this row
      // immediately -- the UX doc's "confirm every successful action"
      // rule, satisfied here by the ledger itself visibly updating
      // rather than a toast the user might miss.
      router.back();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const unpaidMembers = ledger?.members.filter((m) => !m.has_paid) ?? [];
  const memberOptions = unpaidMembers.map((m) => ({
    value: String(m.membership_id),
    label: m.name,
    avatarText: getInitials(m.name),
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader title="Record Contribution" onBack={() => router.back()} />

      <SafeAreaView edges={['bottom']} style={styles.container}>
        <View style={styles.content}>
          {loadState === 'loading' && (
            <>
              <Skeleton height={52} borderRadius={Radius.md} style={{ marginBottom: Spacing.xl }} />
              <Skeleton height={52} borderRadius={Radius.md} style={{ marginBottom: Spacing.xl }} />
            </>
          )}

          {loadState === 'error' && (
            <View>
              <Banner message={loadError ?? 'Something went wrong.'} tone="danger" />
              <Button label="Retry" variant="outline" onPress={loadLedger} style={styles.retryButton} />
            </View>
          )}

          {loadState === 'success' && ledger && unpaidMembers.length === 0 && (
            <View style={styles.emptyBlock}>
              <Ionicons name="checkmark-circle-outline" size={36} color={colors.success} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Everyone has paid</Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                All members are up to date for this cycle. Nothing left to record.
              </Text>
            </View>
          )}

          {loadState === 'success' && ledger && unpaidMembers.length > 0 && (
            <>
              <SelectField
                label="Select Member"
                options={memberOptions}
                value={selectedMembershipId}
                onChange={setSelectedMembershipId}
              />

              <Text style={[styles.label, { color: colors.text }]}>Amount (XAF)</Text>
              <View style={[styles.amountField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.amountValue, { color: colors.text }]}>
                  {ledger.contribution_amount.toLocaleString()}
                </Text>
                <Text style={[styles.amountHint, { color: colors.textSecondary }]}>Fixed amount</Text>
              </View>

              {/* TODO: MoMo screenshot attachment is deferred -- there's no
                  file-upload/storage backend yet. Shipping the picker
                  without anywhere for it to go would be a dead-end
                  control, not just an unwired one. */}

              {formError && <Banner message={formError} tone="danger" />}

              <View style={styles.spacer} />

              <Button
                label="Save Contribution"
                onPress={handleSave}
                loading={isSubmitting}
                disabled={isSubmitting}
              />
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
  },
  retryButton: {
    marginTop: Spacing.md,
  },
  label: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.semibold,
    marginBottom: Spacing.sm,
  },
  amountField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  amountValue: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.semibold,
  },
  amountHint: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
  },
  spacer: {
    flex: 1,
    minHeight: Spacing.xl,
  },
  emptyBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.bold,
  },
  emptyBody: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.regular,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
