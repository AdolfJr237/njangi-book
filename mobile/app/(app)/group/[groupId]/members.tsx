import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { CustomTabBar } from '@/components/CustomTabBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Skeleton } from '@/components/Skeleton';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { ApiError } from '@/services/apiClient';
import { MemberRow, MembersList, getMembers, removeMember } from '@/services/membersApi';

function getInitials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

const FREQUENCY_LABEL: Record<MembersList['meeting_frequency'], string> = {
  every_two_days: 'Every 2 days',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
};

type LoadState = 'loading' | 'error' | 'success';

export default function MembersScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  const [data, setData] = useState<MembersList | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const loadMembers = useCallback(async () => {
    if (!token || !groupId) return;
    setLoadState('loading');
    try {
      const result = await getMembers(groupId, token);
      setData(result);
      setLoadState('success');
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
      setLoadState('error');
    }
  }, [token, groupId]);

  // useFocusEffect -- a member removed from this screen (or joining via
  // invite code elsewhere) should never show stale on return.
  useFocusEffect(
    useCallback(() => {
      loadMembers();
    }, [loadMembers])
  );

  const confirmRemove = (member: MemberRow) => {
    Alert.alert(
      'Remove member?',
      `${member.name} will lose access to this group. Their past contributions stay on record.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => handleRemove(member),
        },
      ]
    );
  };

  const handleRemove = async (member: MemberRow) => {
    if (!token || !groupId) return;
    setRemovingId(member.membership_id);
    try {
      await removeMember(groupId, member.membership_id, token);
      await loadMembers();
    } catch (error) {
      Alert.alert('Could not remove member', error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  const isTreasurer = data?.my_role === 'treasurer';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader title="Members" onBack={() => router.replace('/(app)/dashboard')} />

      <SafeAreaView edges={['bottom']} style={styles.container}>
        {loadState === 'loading' && (
          <View style={styles.listContent}>
            <Skeleton height={56} borderRadius={Radius.card} style={{ marginBottom: Spacing.md }} />
            <Skeleton height={56} borderRadius={Radius.card} style={{ marginBottom: Spacing.md }} />
            <Skeleton height={56} borderRadius={Radius.card} style={{ marginBottom: Spacing.md }} />
          </View>
        )}

        {loadState === 'error' && (
          <View style={styles.listContent}>
            <Banner message={errorMessage ?? 'Something went wrong.'} tone="danger" />
            <Button label="Retry" variant="outline" onPress={loadMembers} style={styles.retryButton} />
          </View>
        )}

        {loadState === 'success' && data && (
          <FlatList
            data={data.members}
            keyExtractor={(item) => String(item.membership_id)}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLeft, { color: colors.text }]}>
                  {data.member_count} MEMBERS
                </Text>
                <Text style={[styles.summaryRight, { color: colors.textSecondary }]}>
                  {FREQUENCY_LABEL[data.meeting_frequency]} · {data.contribution_amount.toLocaleString()} XAF/cycle
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Pressable
                  style={styles.rowMain}
                  onPress={() =>
                    router.push({
                      pathname: '/group/[groupId]/member-detail',
                      params: {
                        groupId,
                        memberId: String(item.membership_id),
                        name: item.name,
                        phoneNumber: item.phone_number,
                        role: item.role,
                        rotationPosition: item.rotation_position != null ? String(item.rotation_position) : '',
                      },
                    })
                  }
                >
                  <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                    <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                  </View>
                  <View style={styles.rowTextBlock}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                      {item.role === 'treasurer' && (
                        <View style={[styles.treasurerPill, { backgroundColor: `${colors.warning}1A` }]}>
                          <Text style={[styles.treasurerPillText, { color: colors.warning }]}>Treasurer</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>
                      Position #{item.rotation_position ?? '—'} · {item.phone_number}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </Pressable>

                {isTreasurer && !item.is_self && (
                  <Pressable
                    hitSlop={8}
                    onPress={() => confirmRemove(item)}
                    disabled={removingId === item.membership_id}
                    style={styles.removeButton}
                  >
                    <Ionicons
                      name="person-remove-outline"
                      size={20}
                      color={removingId === item.membership_id ? colors.textSecondary : colors.danger}
                    />
                  </Pressable>
                )}
              </View>
            )}
          />
        )}
      </SafeAreaView>
      <CustomTabBar groupId={groupId ?? ''} activeTab="members" />
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  summaryLeft: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.bold,
    letterSpacing: 0.4,
  },
  summaryRight: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
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
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  removeButton: {
    padding: Spacing.xs,
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.semibold,
  },
  treasurerPill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  treasurerPillText: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.semibold,
  },
  meta: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    marginTop: 2,
  },
});
