import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { GroupCard } from '@/components/GroupCard';
import { Skeleton } from '@/components/Skeleton';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { ApiError } from '@/services/apiClient';
import { GroupSummary, listMyGroups } from '@/services/groupsApi';
import { getUnreadCount } from '@/services/notificationsApi';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 18) return 'Good afternoon,';
  return 'Good evening,';
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDisplayDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function GroupCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[skeletonStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Skeleton width="60%" height={20} />
      <View style={{ height: Spacing.sm }} />
      <Skeleton width="40%" height={14} />
      <View style={{ height: Spacing.lg }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Skeleton width={90} height={18} />
        <Skeleton width={70} height={18} />
      </View>
    </View>
  );
}

type LoadState = 'loading' | 'error' | 'success';

export default function Dashboard() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const displayName = user?.full_name ?? '';

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadGroups = useCallback(async () => {
    if (!token) return;
    setLoadState('loading');
    try {
      const data = await listMyGroups(token);
      setGroups(data);
      setLoadState('success');
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
      setLoadState('error');
    }
  }, [token]);

  const loadUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const { unread_count } = await getUnreadCount(token);
      setUnreadCount(unread_count);
    } catch {
      // Non-critical -- the badge just stays at its last known count
      // rather than blocking the Dashboard with an error over this.
    }
  }, [token]);

  // useFocusEffect (not useEffect) so a group created or joined elsewhere
  // shows up here the moment you navigate back to Dashboard, instead of
  // only on the very first mount -- the 1.0 app's stale-list bug this
  // was meant to avoid, per CLAUDE.md's build-order notes. Same reason
  // the unread badge refreshes here too: returning from Notifications
  // (or from recording/closing something elsewhere) should update it
  // immediately, not just on app launch.
  useFocusEffect(
    useCallback(() => {
      loadGroups();
      loadUnreadCount();
    }, [loadGroups, loadUnreadCount])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />

      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + Spacing.sm }]}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{displayName}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            hitSlop={8}
            style={styles.bellButton}
            onPress={() => router.push('/(app)/notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.white} />
            {unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.danger }]}>
                <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
          <View style={[styles.avatar, { backgroundColor: colors.white }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {getInitials(displayName)}
            </Text>
          </View>
        </View>
      </View>

      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Groups</Text>

          {loadState === 'loading' && (
            <>
              <GroupCardSkeleton />
              <GroupCardSkeleton />
            </>
          )}

          {loadState === 'error' && (
            <View style={styles.errorBlock}>
              <Banner message={errorMessage ?? 'Something went wrong.'} tone="danger" />
              <Button label="Retry" variant="outline" onPress={loadGroups} style={styles.retryButton} />
            </View>
          )}

          {loadState === 'success' && groups.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="people-outline" size={36} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No groups yet</Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                Create a njangi group to start tracking contributions, or join one with an invite
                code from your treasurer.
              </Text>
            </View>
          )}

          {loadState === 'success' &&
            groups.map((group) => (
              <GroupCard
                key={group.id}
                name={group.name}
                collectorName={group.collector_name ?? 'Not yet assigned'}
                contributionAmount={group.contribution_amount}
                nextDueDate={group.next_due_date ? formatDisplayDate(group.next_due_date) : 'Not scheduled'}
                onPress={() =>
                  router.push({ pathname: '/group/[groupId]/home', params: { groupId: String(group.id) } })
                }
              />
            ))}

          <View style={[styles.howItWorksCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.howItWorksTitle, { color: colors.text }]}>How it works</Text>
            <Text style={[styles.howItWorksBody, { color: colors.textSecondary }]}>
              Create or join a njangi group. Record contributions each meeting and track whose
              turn it is to collect the pot. Every entry is timestamped and visible to all
              members.
            </Text>
          </View>

          <Button
            label="+  Create a New Group"
            onPress={() => router.push('/(app)/create-group')}
            style={styles.button}
          />
          <Button
            label="Join with Invite Code"
            variant="outline"
            onPress={() => router.push('/(app)/join-group')}
            style={styles.button}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.regular,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.bold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bellButton: {
    padding: Spacing.xs,
  },
  unreadBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
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
  avatar: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.bold,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.bold,
    marginBottom: Spacing.md,
  },
  errorBlock: {
    marginBottom: Spacing.md,
  },
  retryButton: {
    marginTop: Spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.bold,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyBody: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  howItWorksCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    marginTop: Spacing.sm,
  },
  howItWorksTitle: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  howItWorksBody: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    width: '100%',
    marginBottom: Spacing.md,
  },
});
