import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { CustomTabBar } from '@/components/CustomTabBar';
import { QuickActionRow } from '@/components/QuickActionRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Skeleton } from '@/components/Skeleton';
import { StatCard } from '@/components/StatCard';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { ApiError } from '@/services/apiClient';
import { ContributionsLedger, getContributionsLedger } from '@/services/contributionsApi';
import { CloseCycleResult, closeCycle, reopenCycle } from '@/services/cycleApi';
import { getGroupHome, GroupHome } from '@/services/groupsApi';
import { getUnreadCount } from '@/services/notificationsApi';

function formatMonthYear(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function formatDisplayDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

type LoadState = 'loading' | 'error' | 'success';

export default function GroupHomeScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  const [groupHome, setGroupHome] = useState<GroupHome | null>(null);
  const [ledger, setLedger] = useState<ContributionsLedger | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Feedback from the two cycle actions -- cleared at the start of
  // every fresh load so it only shows right after THIS session's own
  // action, never on a later revisit to this screen.
  const [closeCycleResult, setCloseCycleResult] = useState<CloseCycleResult | null>(null);
  const [reopenMessage, setReopenMessage] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const { unread_count } = await getUnreadCount(token);
      setUnreadCount(unread_count);
    } catch {
      // Non-critical -- badge just keeps its last known value.
    }
  }, [token]);

  const loadGroupHome = useCallback(async () => {
    if (!token || !groupId) return;
    setLoadState('loading');
    setCloseCycleResult(null);
    setReopenMessage(null);
    setActionError(null);
    try {
      const [homeData, ledgerData] = await Promise.all([
        getGroupHome(groupId, token),
        getContributionsLedger(groupId, token),
      ]);
      setGroupHome(homeData);
      setLedger(ledgerData);
      setLoadState('success');
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
      setLoadState('error');
    }
  }, [token, groupId]);

  // useFocusEffect, not useEffect -- recording a contribution changes
  // has_paid_this_cycle and the pot total, and this screen should show
  // that the moment you navigate back to it, not just on first mount.
  // Same reasoning for the unread badge -- a notification could have
  // arrived while you were elsewhere.
  useFocusEffect(
    useCallback(() => {
      loadGroupHome();
      loadUnreadCount();
    }, [loadGroupHome, loadUnreadCount])
  );

  const handleBack = () => router.replace('/(app)/dashboard');

  const isTreasurer = groupHome?.my_role === 'treasurer';
  const unpaidNames = ledger?.members.filter((m) => !m.has_paid).map((m) => m.name) ?? [];

  const confirmCloseCycle = () => {
    const message =
      unpaidNames.length > 0
        ? `${unpaidNames.length} member${unpaidNames.length > 1 ? 's' : ''} haven't paid this cycle: ${unpaidNames.join(', ')}. They'll carry forward as owing. Close this cycle and move to the next collector anyway?`
        : 'Close this cycle and move to the next collector?';

    Alert.alert('Close cycle?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Close cycle', onPress: handleCloseCycle },
    ]);
  };

  const handleCloseCycle = async () => {
    if (!token || !groupId) return;
    setIsClosing(true);
    setActionError(null);
    try {
      const result = await closeCycle(groupId, token);
      setCloseCycleResult(result);
      const [homeData, ledgerData] = await Promise.all([
        getGroupHome(groupId, token),
        getContributionsLedger(groupId, token),
      ]);
      setGroupHome(homeData);
      setLedger(ledgerData);
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsClosing(false);
    }
  };

  // Same condition the backend enforces (zero contributions on the
  // current cycle) -- this doesn't loosen the safety gate at all, it
  // just keeps the link visible for as long as that gate is actually
  // open, instead of only right after this session's own close.
  // cycle_number > 1 confirms a previous cycle genuinely exists to
  // revert to (a brand new group's very first cycle has nothing to
  // undo back to).
  const canUndoLastClose = isTreasurer && ledger?.paid_count === 0 && (groupHome?.cycle_number ?? 0) > 1;

  const confirmUndo = () => {
    Alert.alert(
      'Undo last close?',
      'This reopens the previous cycle for contributions and reverts the collector. Only the single most recent close can be undone this way.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Undo', style: 'destructive', onPress: handleUndo },
      ]
    );
  };

  const handleUndo = async () => {
    if (!token || !groupId) return;
    setIsReopening(true);
    setActionError(null);
    try {
      const result = await reopenCycle(groupId, token);
      setCloseCycleResult(null);
      setReopenMessage(
        `Cycle reopened. ${result.collector_name ?? 'The previous collector'} is collecting again.`
      );
      const [homeData, ledgerData] = await Promise.all([
        getGroupHome(groupId, token),
        getContributionsLedger(groupId, token),
      ]);
      setGroupHome(homeData);
      setLedger(ledgerData);
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsReopening(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader
        title={groupHome?.name ?? 'Group Home'}
        subtitle={groupHome ? `Cycle #${groupHome.cycle_number}` : undefined}
        onBack={handleBack}
        rightSlot={
          <Pressable hitSlop={8} style={styles.bellButton} onPress={() => router.push('/(app)/notifications')}>
            <Ionicons name="notifications-outline" size={22} color={colors.white} />
            {unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.danger }]}>
                <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        }
      />

      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          {loadState === 'loading' && (
            <>
              <Skeleton height={180} borderRadius={Radius.card} style={styles.heroCard} />
              <Skeleton height={90} borderRadius={Radius.card} style={styles.statsRow} />
            </>
          )}

          {loadState === 'error' && (
            <View style={styles.errorBlock}>
              <Banner message={errorMessage ?? 'Something went wrong.'} tone="danger" />
              <Button label="Retry" variant="outline" onPress={loadGroupHome} style={styles.retryButton} />
            </View>
          )}

          {loadState === 'success' && groupHome && (
            <>
              {closeCycleResult && (
                <View style={[styles.feedbackCard, { backgroundColor: colors.card, borderColor: colors.success }]}>
                  <Text style={[styles.feedbackTitle, { color: colors.success }]}>Cycle closed</Text>
                  <Text style={[styles.feedbackBody, { color: colors.text }]}>
                    {closeCycleResult.new_collector_name} collects next, due{' '}
                    {formatDisplayDate(closeCycleResult.new_meeting_date)}
                    {closeCycleResult.started_new_round ? ' -- a new round has started.' : '.'}
                  </Text>
                  {closeCycleResult.unpaid_member_names.length > 0 && (
                    <Text style={[styles.feedbackBody, { color: colors.textSecondary }]}>
                      Carrying forward as owing: {closeCycleResult.unpaid_member_names.join(', ')}
                    </Text>
                  )}
                </View>
              )}

              {reopenMessage && (
                <View style={styles.feedbackSpacer}>
                  <Banner message={reopenMessage} tone="success" />
                </View>
              )}

              {actionError && (
                <View style={styles.feedbackSpacer}>
                  <Banner message={actionError} tone="danger" />
                </View>
              )}

              <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
                <View style={styles.heroTopRow}>
                  <Text style={styles.heroLabel}>Collecting this cycle</Text>
                  {groupHome.collecting_date && (
                    <View style={styles.monthBadge}>
                      <Text style={styles.monthBadgeText}>{formatMonthYear(groupHome.collecting_date)}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.collectorRow}>
                  <View style={styles.collectorAvatar}>
                    <Text style={[styles.collectorInitials, { color: colors.primary }]}>
                      {groupHome.collector_name ? groupHome.collector_name[0].toUpperCase() : '?'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.collectorName}>{groupHome.collector_name ?? 'Not yet assigned'}</Text>
                    {groupHome.collector_position !== null && (
                      <Text style={styles.collectorPosition}>
                        Position #{groupHome.collector_position} in rotation
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.heroDivider} />

                <Text style={styles.heroLabel}>Total pot this cycle</Text>
                <Text style={styles.heroAmount}>{groupHome.total_pot_this_cycle.toLocaleString()} XAF</Text>
              </View>

              <View style={styles.statsRow}>
                <StatCard
                  label="My Standing"
                  value={groupHome.has_paid_this_cycle ? 'Paid' : 'Not paid'}
                  valueColor={groupHome.has_paid_this_cycle ? colors.success : colors.warning}
                  subtext={groupHome.has_paid_this_cycle ? 'Up to date' : 'Due this cycle'}
                  showCheckIcon={groupHome.has_paid_this_cycle}
                />
              </View>

              {isTreasurer && !closeCycleResult && (
                <>
                  {ledger?.ready_to_close && (
                    <View style={styles.feedbackSpacer}>
                      <Banner message="Everyone has paid -- this cycle is ready to close." tone="success" />
                    </View>
                  )}
                  <Button
                    label="Close Cycle & Advance"
                    onPress={confirmCloseCycle}
                    loading={isClosing}
                    disabled={isClosing}
                    style={styles.closeCycleButton}
                  />
                </>
              )}

              {/* Deliberately understated -- a quiet correction link, not
                  a button inviting a tap. Only shows for as long as the
                  backend's own safety gate is open (zero contributions
                  recorded against the current cycle), and still confirms
                  before firing since undoing a close is itself
                  consequential. */}
              {canUndoLastClose && (
                <Pressable
                  onPress={confirmUndo}
                  disabled={isReopening}
                  hitSlop={8}
                  style={styles.undoLink}
                >
                  <Ionicons name="arrow-undo-outline" size={13} color={colors.textSecondary} />
                  <Text style={[styles.undoLinkText, { color: colors.textSecondary }]}>
                    {isReopening
                      ? 'Undoing...'
                      : 'Undo last close -- no contributions recorded yet this cycle'}
                  </Text>
                </Pressable>
              )}
            </>
          )}

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <QuickActionRow
            icon="calendar-outline"
            label="View Rotation Schedule"
            onPress={() =>
              router.push({ pathname: '/group/[groupId]/rotation-schedule', params: { groupId } })
            }
          />
          <QuickActionRow
            icon="book-outline"
            label="Contributions Ledger"
            onPress={() =>
              router.replace({ pathname: '/group/[groupId]/contributions', params: { groupId } })
            }
          />
          <QuickActionRow
            icon="cash-outline"
            label="Active Loans"
            onPress={() =>
              router.push({ pathname: '/group/[groupId]/loans', params: { groupId } })
            }
          />
          <QuickActionRow
            icon="alert-circle-outline"
            label="Fines"
            onPress={() =>
              router.push({ pathname: '/group/[groupId]/fines', params: { groupId } })
            }
          />
        </ScrollView>
      </SafeAreaView>
      <CustomTabBar groupId={groupId ?? ''} activeTab="home" />
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
    // Extra bottom room so content can scroll clear of the floating tab bar.
    paddingBottom: Spacing.xxl + 80,
  },
  errorBlock: {
    marginBottom: Spacing.lg,
  },
  retryButton: {
    marginTop: Spacing.md,
  },
  feedbackCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  feedbackTitle: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.bold,
    marginBottom: Spacing.xs,
  },
  feedbackBody: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.regular,
    lineHeight: 19,
    marginBottom: Spacing.xs,
  },
  feedbackSpacer: {
    marginBottom: Spacing.lg,
  },
  undoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginTop: -Spacing.md,
    marginBottom: Spacing.xl,
  },
  undoLinkText: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    textAlign: 'center',
  },
  bellButton: {
    padding: Spacing.xs,
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Typography.family.bold,
  },
  heroCard: {
    borderRadius: Radius.card,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
  },
  monthBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  monthBadgeText: {
    color: '#FFFFFF',
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.semibold,
  },
  collectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  collectorAvatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectorInitials: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.bold,
  },
  collectorName: {
    color: '#FFFFFF',
    fontSize: Typography.size.md,
    fontFamily: Typography.family.bold,
  },
  collectorPosition: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    marginTop: 2,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: Spacing.lg,
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: Typography.size.xxl,
    fontFamily: Typography.family.bold,
    marginTop: Spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  closeCycleButton: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.bold,
    marginBottom: Spacing.md,
  },
});
