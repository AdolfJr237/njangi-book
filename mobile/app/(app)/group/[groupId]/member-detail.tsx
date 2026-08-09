import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { CustomTabBar } from '@/components/CustomTabBar';
import { Pill } from '@/components/Pill';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Skeleton } from '@/components/Skeleton';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { ApiError } from '@/services/apiClient';
import {
  MyContributions,
  getMemberContributions,
  recordContribution,
} from '@/services/contributionsApi';

function getInitials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

type LoadState = 'loading' | 'error' | 'success';

type MemberDetailParams = {
  groupId: string;
  memberId: string;
  name: string;
  phoneNumber: string;
  role: 'treasurer' | 'member';
  rotationPosition: string;
};

export default function MemberDetailScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const { groupId, memberId, name, phoneNumber, role, rotationPosition } =
    useLocalSearchParams<MemberDetailParams>();

  const [data, setData] = useState<MyContributions | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordingMeetingId, setRecordingMeetingId] = useState<number | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);

  // Reuses the same per-member contributions endpoint My Contributions
  // uses for the logged-in user's own history -- full-ledger
  // transparency means any member can see this for anyone else, the
  // same way the Ledger already shows everyone's current-cycle status.
  const loadData = useCallback(async () => {
    if (!token || !groupId || !memberId) return;
    setLoadState('loading');
    try {
      const result = await getMemberContributions(groupId, Number(memberId), token);
      setData(result);
      setLoadState('success');
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
      setLoadState('error');
    }
  }, [token, groupId, memberId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const isTreasurer = data?.my_role === 'treasurer';

  const handleRecordLate = async (meetingId: number) => {
    if (!token || !groupId || !memberId) return;
    setRecordingMeetingId(meetingId);
    setRecordError(null);
    try {
      await recordContribution(groupId, Number(memberId), token, meetingId);
      await loadData();
    } catch (error) {
      setRecordError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setRecordingMeetingId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader title="Member Record" onBack={() => router.back()} />

      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{getInitials(name)}</Text>
            </View>
            <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
            <Text style={[styles.phone, { color: colors.textSecondary }]}>{phoneNumber}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.neutralPill, { backgroundColor: colors.surface }]}>
                <Text style={[styles.neutralPillText, { color: colors.textSecondary }]}>
                  {role === 'treasurer' ? 'Treasurer' : 'Member'}
                </Text>
              </View>
              <View style={[styles.neutralPill, { backgroundColor: colors.surface }]}>
                <Text style={[styles.neutralPillText, { color: colors.textSecondary }]}>
                  Position #{rotationPosition || '—'}
                </Text>
              </View>
            </View>
          </View>

          {loadState === 'loading' && (
            <>
              <Skeleton height={80} borderRadius={Radius.card} style={{ marginBottom: Spacing.lg }} />
              <Skeleton height={56} borderRadius={Radius.card} style={{ marginBottom: Spacing.lg }} />
            </>
          )}

          {loadState === 'error' && (
            <View style={{ marginBottom: Spacing.lg }}>
              <Banner message={errorMessage ?? 'Something went wrong.'} tone="danger" />
              <Button label="Retry" variant="outline" onPress={loadData} style={styles.retryButton} />
            </View>
          )}

          {loadState === 'success' && data && (
            <>
              <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.statBlock}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{data.payments_count}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Payments</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statBlock}>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    {data.total_paid.toLocaleString()}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Paid</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statBlock}>
                  <Text
                    style={[
                      styles.statValue,
                      { color: data.outstanding_amount > 0 ? colors.danger : colors.text },
                    ]}
                  >
                    {data.outstanding_amount.toLocaleString()}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Outstanding</Text>
                </View>
              </View>

              {recordError && <Banner message={recordError} tone="danger" />}

              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>OUTSTANDING</Text>
              {data.outstanding.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Nothing outstanding -- fully paid up.
                </Text>
              )}
              {data.outstanding.map((entry) => (
                <View
                  key={entry.meeting_id}
                  style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.rowTextBlock}>
                    <Text style={[styles.rowTitle, { color: colors.text }]}>Cycle #{entry.cycle_number}</Text>
                    <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                      {formatDate(entry.meeting_date)}
                    </Text>
                  </View>
                  <Text style={[styles.rowAmount, { color: colors.danger }]}>
                    {entry.amount.toLocaleString()} XAF
                  </Text>
                  {isTreasurer && (
                    <Button
                      label="Record now"
                      variant="outline"
                      onPress={() => handleRecordLate(entry.meeting_id)}
                      loading={recordingMeetingId === entry.meeting_id}
                      disabled={recordingMeetingId !== null}
                      style={styles.recordButton}
                    />
                  )}
                </View>
              ))}

              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PAYMENT HISTORY</Text>
              {data.history.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No payments yet.</Text>
              )}
              {data.history.map((entry) => {
                // Same three-state treatment as My Contributions: a
                // normal payment, a correcting entry itself, or an
                // original that's since been reversed -- never removed
                // from this list, just clearly marked either way.
                const dotColor = entry.is_reversal
                  ? colors.textSecondary
                  : entry.reversed
                    ? colors.danger
                    : colors.success;
                const canReverse = isTreasurer && !entry.is_reversal && !entry.reversed;
                return (
                  <View key={entry.id} style={styles.historyRow}>
                    <View style={[styles.dot, { backgroundColor: dotColor }]} />
                    <View style={styles.rowTextBlock}>
                      <Text
                        style={[
                          styles.rowTitle,
                          { color: entry.reversed ? colors.textSecondary : colors.text },
                          entry.reversed && styles.strikethrough,
                        ]}
                      >
                        Cycle #{entry.cycle_number}
                      </Text>
                      <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                        {formatDate(entry.paid_date)} · Recorded by {entry.recorded_by_name}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.rowAmount,
                        { color: entry.reversed ? colors.textSecondary : colors.text },
                        entry.reversed && styles.strikethrough,
                      ]}
                    >
                      {entry.amount.toLocaleString()} XAF
                    </Text>
                    {canReverse && (
                      <Pressable
                        hitSlop={8}
                        style={styles.reverseIconButton}
                        onPress={() =>
                          router.push({
                            pathname: '/group/[groupId]/reverse-contribution',
                            params: {
                              groupId,
                              contributionId: String(entry.id),
                              memberName: name,
                              amount: String(entry.amount),
                              paidDate: entry.paid_date,
                            },
                          })
                        }
                      >
                        <Ionicons name="arrow-undo-outline" size={18} color={colors.danger} />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </>
          )}

          <View style={[styles.comingSoonBox, { backgroundColor: colors.surface }]}>
            <Ionicons name="construct-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.comingSoonText, { color: colors.textSecondary }]}>
              Loans, fines, and dispute history for this member aren't available yet -- coming in a
              future update.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
      <CustomTabBar groupId={groupId ?? ''} activeTab="members" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl + 100,
  },
  profileCard: {
    alignItems: 'center',
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.bold,
  },
  name: {
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.bold,
  },
  phone: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.regular,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  neutralPill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  neutralPillText: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.semibold,
  },
  statsCard: {
    flexDirection: 'row',
    borderRadius: Radius.card,
    borderWidth: 1,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
  },
  statValue: {
    fontSize: Typography.size.xl,
    fontFamily: Typography.family.bold,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
  },
  sectionTitle: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.semibold,
    letterSpacing: 0.6,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.regular,
    marginBottom: Spacing.lg,
  },
  retryButton: {
    marginTop: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowTextBlock: {
    flex: 1,
  },
  rowTitle: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.semibold,
  },
  rowMeta: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    marginTop: 2,
  },
  rowAmount: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.semibold,
  },
  recordButton: {
    marginLeft: Spacing.sm,
  },
  reverseIconButton: {
    padding: Spacing.xs,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  comingSoonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
  },
  comingSoonText: {
    flex: 1,
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    lineHeight: 18,
  },
});
