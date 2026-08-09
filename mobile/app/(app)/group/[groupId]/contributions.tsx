import { useCallback, useState } from 'react';
import { Pressable, FlatList, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { CustomTabBar } from '@/components/CustomTabBar';
import { Fab } from '@/components/Fab';
import { Pill } from '@/components/Pill';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Skeleton } from '@/components/Skeleton';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { ApiError } from '@/services/apiClient';
import { ContributionsLedger, getContributionsLedger } from '@/services/contributionsApi';

function formatMeetingDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(isoDateTime: string) {
  return new Date(isoDateTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getInitials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

type LoadState = 'loading' | 'error' | 'success';

export default function ContributionsLedgerScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  const [ledger, setLedger] = useState<ContributionsLedger | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadLedger = useCallback(async () => {
    if (!token || !groupId) return;
    setLoadState('loading');
    try {
      const data = await getContributionsLedger(groupId, token);
      setLedger(data);
      setLoadState('success');
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
      setLoadState('error');
    }
  }, [token, groupId]);

  // useFocusEffect, not useEffect -- recording a contribution navigates
  // back here, and the ledger needs to show that fresh row immediately,
  // not just on first mount (the exact stale-list bug CLAUDE.md flags
  // from the 1.0 app).
  useFocusEffect(
    useCallback(() => {
      loadLedger();
    }, [loadLedger])
  );

  // Treasurer role for THIS group specifically -- a user can be
  // treasurer in one njangi and an ordinary member in another, so this
  // can't be a global flag -- it comes from this group's own ledger
  // response (my_role), set server-side from the caller's Membership row.
  const isTreasurer = ledger?.my_role === 'treasurer';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader
        title="Contributions"
        onBack={() => router.replace('/(app)/dashboard')}
        rightSlot={
          <Pressable
            hitSlop={8}
            onPress={() =>
              router.push({ pathname: '/group/[groupId]/my-contributions', params: { groupId } })
            }
          >
            <Ionicons name="person-circle-outline" size={24} color={colors.white} />
          </Pressable>
        }
      />

      <SafeAreaView edges={['bottom']} style={styles.container}>
        {loadState === 'loading' && (
          <View style={styles.listContent}>
            <Skeleton height={110} borderRadius={Radius.card} style={{ marginBottom: Spacing.lg }} />
            <Skeleton height={64} borderRadius={Radius.card} style={{ marginBottom: Spacing.md }} />
            <Skeleton height={64} borderRadius={Radius.card} style={{ marginBottom: Spacing.md }} />
          </View>
        )}

        {loadState === 'error' && (
          <View style={styles.listContent}>
            <Banner message={errorMessage ?? 'Something went wrong.'} tone="danger" />
            <Button label="Retry" variant="outline" onPress={loadLedger} style={styles.retryButton} />
          </View>
        )}

        {loadState === 'success' && ledger && (
          <FlatList
            data={ledger.members}
            keyExtractor={(item) => String(item.membership_id)}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={[styles.meetingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.meetingTopRow}>
                  <View>
                    <Text style={[styles.meetingTitle, { color: colors.text }]}>
                      {ledger.meeting_date ? formatMeetingDate(ledger.meeting_date) : 'No open meeting'}
                    </Text>
                    <Text style={[styles.meetingSubtitle, { color: colors.textSecondary }]}>
                      {ledger.total_collected.toLocaleString()} of {ledger.total_expected.toLocaleString()} XAF
                      collected
                    </Text>
                  </View>
                </View>

                <View style={styles.progressHeader}>
                  <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                    Paid this meeting
                  </Text>
                  <Text style={[styles.progressCount, { color: colors.text }]}>
                    {ledger.paid_count} of {ledger.member_count}
                  </Text>
                </View>
                <ProgressBar progress={ledger.member_count ? ledger.paid_count / ledger.member_count : 0} />
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                </View>
                <View style={styles.rowTextBlock}>
                  <Text style={[styles.rowName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.rowDate, { color: colors.textSecondary }]}>
                    {item.paid_date ? formatMeetingDate(item.paid_date) : '—'}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  {item.amount !== null && (
                    <Text style={[styles.rowAmount, { color: colors.text }]}>
                      {item.amount.toLocaleString()} XAF
                    </Text>
                  )}
                  <Pill label={item.has_paid ? 'Paid' : 'Owing'} tone={item.has_paid ? 'success' : 'danger'} />
                </View>
                {isTreasurer && item.has_paid && item.contribution_id !== null && ledger.is_current_cycle && (
                  <Pressable
                    hitSlop={8}
                    style={styles.reverseButton}
                    onPress={() =>
                      router.push({
                        pathname: '/group/[groupId]/reverse-contribution',
                        params: {
                          groupId,
                          contributionId: String(item.contribution_id),
                          memberName: item.name,
                          amount: String(item.amount),
                          paidDate: item.paid_date ?? '',
                        },
                      })
                    }
                  >
                    <Ionicons name="arrow-undo-outline" size={18} color={colors.danger} />
                  </Pressable>
                )}
              </View>
            )}
            ListFooterComponent={
              ledger.reversals.length > 0 ? (
                <View style={styles.correctionsSection}>
                  <Text style={[styles.correctionsTitle, { color: colors.textSecondary }]}>
                    CORRECTIONS THIS CYCLE
                  </Text>
                  {ledger.reversals.map((reversal) => (
                    <View
                      key={reversal.original_contribution_id}
                      style={[styles.correctionRow, { backgroundColor: colors.surface }]}
                    >
                      <Ionicons name="arrow-undo-outline" size={16} color={colors.textSecondary} />
                      <View style={styles.rowTextBlock}>
                        <Text style={[styles.correctionText, { color: colors.text }]}>
                          {reversal.member_name}'s {reversal.amount.toLocaleString()} XAF entry (
                          {formatMeetingDate(reversal.original_paid_date)}) was reversed by{' '}
                          {reversal.reversed_by_name} on {formatDateTime(reversal.reversed_at)}.
                        </Text>
                        {reversal.reason && (
                          <Text style={[styles.correctionReason, { color: colors.textSecondary }]}>
                            Reason: {reversal.reason}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ) : null
            }
          />
        )}
      </SafeAreaView>
      <CustomTabBar groupId={groupId ?? ''} activeTab="contributions" />

      {isTreasurer && (
        <Fab
          onPress={() =>
            router.push({ pathname: '/group/[groupId]/record-contribution', params: { groupId } })
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    // Extra bottom room so the last row clears the floating tab bar + FAB.
    paddingBottom: Spacing.xxl + 100,
  },
  retryButton: {
    marginTop: Spacing.md,
  },
  meetingCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  meetingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  meetingTitle: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.bold,
  },
  meetingSubtitle: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    marginTop: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
  },
  progressCount: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.semibold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.bold,
  },
  rowTextBlock: {
    flex: 1,
  },
  rowName: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.semibold,
  },
  rowDate: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    marginTop: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  rowAmount: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.semibold,
  },
  reverseButton: {
    padding: Spacing.xs,
  },
  correctionsSection: {
    marginTop: Spacing.md,
  },
  correctionsTitle: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.semibold,
    letterSpacing: 0.6,
    marginBottom: Spacing.md,
  },
  correctionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  correctionText: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    lineHeight: 18,
  },
  correctionReason: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
});
