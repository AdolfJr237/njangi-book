import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
import { RotationMemberStatus, RotationSchedule, getRotationSchedule } from '@/services/rotationApi';

function getInitials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function subtitleFor(member: RotationMemberStatus) {
  if (member.status === 'done') {
    return member.collected_date ? `Collected ${formatDate(member.collected_date)}` : 'Collected';
  }
  if (member.status === 'current') {
    return 'Collecting this cycle';
  }
  return `Position ${member.rotation_position ?? '—'} · Waiting`;
}

type LoadState = 'loading' | 'error' | 'success';

export default function RotationScheduleScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  const [schedule, setSchedule] = useState<RotationSchedule | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSchedule = useCallback(async () => {
    if (!token || !groupId) return;
    setLoadState('loading');
    try {
      const data = await getRotationSchedule(groupId, token);
      setSchedule(data);
      setLoadState('success');
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
      setLoadState('error');
    }
  }, [token, groupId]);

  // useFocusEffect, not useEffect -- same reasoning as the Contributions
  // Ledger: whose turn it is can change from elsewhere in the app, and
  // this screen should never show a stale rotation on return.
  useFocusEffect(
    useCallback(() => {
      loadSchedule();
    }, [loadSchedule])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader title="Rotation Schedule" onBack={() => router.back()} />

      <SafeAreaView edges={['bottom']} style={styles.container}>
        {loadState === 'loading' && (
          <View style={styles.listContent}>
            <Skeleton height={64} borderRadius={Radius.card} style={{ marginBottom: Spacing.lg }} />
            <Skeleton height={56} borderRadius={Radius.card} style={{ marginBottom: Spacing.md }} />
            <Skeleton height={56} borderRadius={Radius.card} style={{ marginBottom: Spacing.md }} />
          </View>
        )}

        {loadState === 'error' && (
          <View style={styles.listContent}>
            <Banner message={errorMessage ?? 'Something went wrong.'} tone="danger" />
            <Button label="Retry" variant="outline" onPress={loadSchedule} style={styles.retryButton} />
          </View>
        )}

        {loadState === 'success' && schedule && (
          <FlatList
            data={schedule.members}
            keyExtractor={(item) => String(item.membership_id)}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Current Cycle</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    Cycle #{schedule.cycle_number} · {schedule.member_count} members
                  </Text>
                </View>
                <View style={styles.summaryRight}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Pot amount</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {schedule.pot_amount.toLocaleString()} XAF
                  </Text>
                </View>
              </View>
            }
            renderItem={({ item }) => {
              const isCurrent = item.status === 'current';
              const isDone = item.status === 'done';

              return (
                <View
                  style={[
                    styles.row,
                    {
                      backgroundColor: isCurrent ? colors.primary : colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.positionBadge,
                      { backgroundColor: isCurrent ? colors.white : colors.surface },
                    ]}
                  >
                    <Text style={[styles.positionText, { color: isCurrent ? colors.primary : colors.text }]}>
                      {item.rotation_position ?? '—'}
                    </Text>
                  </View>
                  <View style={[styles.avatar, { backgroundColor: isCurrent ? colors.white : colors.primary }]}>
                    <Text style={[styles.avatarText, { color: isCurrent ? colors.primary : colors.white }]}>
                      {getInitials(item.name)}
                    </Text>
                  </View>
                  <View style={styles.rowTextBlock}>
                    <Text
                      style={[
                        styles.rowName,
                        { color: isCurrent ? colors.white : isDone ? colors.textSecondary : colors.text },
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.rowSubtitle,
                        { color: isCurrent ? 'rgba(255,255,255,0.7)' : colors.textSecondary },
                      ]}
                    >
                      {subtitleFor(item)}
                    </Text>
                  </View>
                  {isDone && (
                    <Text style={[styles.doneText, { color: colors.textSecondary }]}>Done</Text>
                  )}
                  {isCurrent && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Current</Text>
                    </View>
                  )}
                  {item.status === 'pending' && <Pill label="Pending" tone="warning" />}
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>
      <CustomTabBar groupId={groupId ?? ''} activeTab="home" />
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
    paddingBottom: Spacing.xxl + 100,
  },
  retryButton: {
    marginTop: Spacing.md,
  },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  summaryLabel: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.bold,
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
  positionBadge: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.bold,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
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
  rowSubtitle: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    marginTop: 2,
  },
  doneText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.regular,
  },
  currentBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.semibold,
  },
});
