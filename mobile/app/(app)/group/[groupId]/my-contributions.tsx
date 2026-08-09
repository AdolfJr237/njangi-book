import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
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
import { MyContributions, getMyContributions } from '@/services/contributionsApi';

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

type LoadState = 'loading' | 'error' | 'success';

export default function MyContributionsScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  const [data, setData] = useState<MyContributions | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!token || !groupId) return;
    setLoadState('loading');
    try {
      const result = await getMyContributions(groupId, token);
      setData(result);
      setLoadState('success');
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
      setLoadState('error');
    }
  }, [token, groupId]);

  // useFocusEffect -- recording a contribution elsewhere should show up
  // here immediately on return, same reasoning as the Ledger and
  // Rotation Schedule.
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const hasHistory = (data?.history.length ?? 0) > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader title="My Contributions" onBack={() => router.back()} />

      <SafeAreaView edges={['bottom']} style={styles.container}>
        {loadState === 'loading' && (
          <View style={styles.listContent}>
            <Skeleton height={90} borderRadius={Radius.card} style={{ marginBottom: Spacing.xl }} />
            <Skeleton height={56} borderRadius={Radius.card} style={{ marginBottom: Spacing.md }} />
            <Skeleton height={56} borderRadius={Radius.card} style={{ marginBottom: Spacing.md }} />
          </View>
        )}

        {loadState === 'error' && (
          <View style={styles.listContent}>
            <Banner message={errorMessage ?? 'Something went wrong.'} tone="danger" />
            <Button label="Retry" variant="outline" onPress={loadHistory} style={styles.retryButton} />
          </View>
        )}

        {loadState === 'success' && data && (
          <FlatList
            data={data.history}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
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

                {hasHistory && (
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    PAYMENT HISTORY
                  </Text>
                )}
              </>
            }
            ListEmptyComponent={
              <View style={styles.emptyBlock}>
                <Ionicons name="receipt-outline" size={36} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No payments yet</Text>
                <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                  Your recorded contributions in this group will show up here.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              // Three states, not just paid/unpaid: a normal payment, a
              // correcting entry itself (is_reversal), or an original
              // that has SINCE been reversed (reversed) -- the row never
              // disappears, it's just clearly marked so it reads as
              // "recorded, then corrected" rather than a silent edit.
              const dotColor = item.is_reversal
                ? colors.textSecondary
                : item.reversed
                  ? colors.danger
                  : colors.success;
              return (
                <View style={styles.historyRow}>
                  <View style={[styles.dot, { backgroundColor: dotColor }]} />
                  <View style={styles.historyTextBlock}>
                    <Text
                      style={[
                        styles.historyTitle,
                        { color: item.reversed ? colors.textSecondary : colors.text },
                        item.reversed && styles.strikethrough,
                      ]}
                    >
                      Cycle #{item.cycle_number}
                    </Text>
                    <Text style={[styles.historyMeta, { color: colors.textSecondary }]}>
                      {formatDate(item.paid_date)}
                    </Text>
                    <Text style={[styles.historyMeta, { color: colors.textSecondary }]}>
                      Recorded by {item.recorded_by_name}
                    </Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text
                      style={[
                        styles.historyAmount,
                        { color: item.reversed ? colors.textSecondary : colors.text },
                        item.reversed && styles.strikethrough,
                      ]}
                    >
                      {item.amount.toLocaleString()} XAF
                    </Text>
                    {item.is_reversal ? (
                      <Pill label="Reversal" tone="warning" />
                    ) : item.reversed ? (
                      <Pill label="Reversed" tone="danger" />
                    ) : (
                      <Pill label="Paid" tone="success" />
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>
      <CustomTabBar groupId={groupId ?? ''} activeTab="contributions" />
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
  emptyBlock: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
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
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  historyTextBlock: {
    flex: 1,
  },
  historyTitle: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.semibold,
  },
  historyMeta: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  historyAmount: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.semibold,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
});
