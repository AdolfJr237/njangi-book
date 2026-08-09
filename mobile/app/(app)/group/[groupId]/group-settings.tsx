import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { MemberRow, MembersList, getMembers, transferTreasurer } from '@/services/membersApi';

function getInitials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

type LoadState = 'loading' | 'error' | 'success';

export default function GroupSettings() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  const [data, setData] = useState<MembersList | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      loadMembers();
    }, [loadMembers])
  );

  const selectableMembers = data?.members.filter((m) => !m.is_self) ?? [];

  // Suggested default: the second person in the group's rotation order
  // overall (not the second SELECTABLE member) -- rotation order is
  // independent of who currently holds the treasurer role, and "who's
  // next in line" is a sensible starting suggestion, not a requirement.
  // The treasurer can still tap anyone else in the list.
  useEffect(() => {
    if (!data || selectedId !== null) return;
    const second = data.members[1];
    const suggested = second && !second.is_self ? second : selectableMembers[0];
    if (suggested) setSelectedId(suggested.membership_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const selectedMember = selectableMembers.find((m) => m.membership_id === selectedId) ?? null;

  const confirmTransfer = () => {
    if (!selectedMember) return;
    Alert.alert(
      'Transfer treasurer role?',
      `${selectedMember.name} will become the treasurer. You will become an ordinary member and lose treasurer rights -- including recording contributions, closing cycles, and managing members.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Transfer', style: 'destructive', onPress: handleTransfer },
      ]
    );
  };

  const handleTransfer = async () => {
    if (!token || !groupId || !selectedMember) return;
    setIsTransferring(true);
    setTransferError(null);
    try {
      const result = await transferTreasurer(groupId, selectedMember.membership_id, token);
      Alert.alert('Treasurer role transferred', `${result.new_treasurer_name} is now the treasurer.`, [
        {
          text: 'OK',
          onPress: () => router.replace({ pathname: '/group/[groupId]/more', params: { groupId } }),
        },
      ]);
    } catch (error) {
      setTransferError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsTransferring(false);
    }
  };

  const isTreasurer = data?.my_role === 'treasurer';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader title="Group Settings" onBack={() => router.back()} />

      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          {loadState === 'loading' && (
            <>
              <Skeleton height={56} borderRadius={Radius.card} style={{ marginBottom: Spacing.md }} />
              <Skeleton height={56} borderRadius={Radius.card} style={{ marginBottom: Spacing.md }} />
            </>
          )}

          {loadState === 'error' && (
            <View>
              <Banner message={errorMessage ?? 'Something went wrong.'} tone="danger" />
              <Button label="Retry" variant="outline" onPress={loadMembers} style={styles.retryButton} />
            </View>
          )}

          {loadState === 'success' && data && !isTreasurer && (
            <Text style={[styles.restrictedText, { color: colors.textSecondary }]}>
              Only the group's treasurer can access settings.
            </Text>
          )}

          {loadState === 'success' && data && isTreasurer && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                TRANSFER TREASURER ROLE
              </Text>
              <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                Hand the treasurer role to another active member. This is deliberate and immediate --
                you'll become an ordinary member right away. There's no automatic or vote-based
                transfer; only the current treasurer can do this.
              </Text>

              {selectableMembers.length === 0 && (
                <Banner message="You're the only member -- invite others before transferring the treasurer role." />
              )}

              {selectableMembers.length > 0 && (
                <>
                  <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {selectableMembers.map((member, index) => {
                      const isSelected = member.membership_id === selectedId;
                      const isSuggested =
                        data.members[1]?.membership_id === member.membership_id && !data.members[1].is_self;
                      return (
                        <Pressable
                          key={member.membership_id}
                          onPress={() => setSelectedId(member.membership_id)}
                          style={[
                            styles.memberRow,
                            index < selectableMembers.length - 1 && {
                              borderBottomWidth: 1,
                              borderBottomColor: colors.border,
                            },
                          ]}
                        >
                          <Ionicons
                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                            size={20}
                            color={isSelected ? colors.primary : colors.textSecondary}
                          />
                          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                            <Text style={styles.avatarText}>{getInitials(member.name)}</Text>
                          </View>
                          <View style={styles.memberTextBlock}>
                            <Text style={[styles.memberName, { color: colors.text }]}>{member.name}</Text>
                            <Text style={[styles.memberMeta, { color: colors.textSecondary }]}>
                              Position #{member.rotation_position ?? '—'}
                              {isSuggested ? ' · Suggested' : ''}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>

                  {transferError && <Banner message={transferError} tone="danger" />}

                  <Button
                    label="Transfer Treasurer Role"
                    onPress={confirmTransfer}
                    loading={isTransferring}
                    disabled={isTransferring || !selectedMember}
                    style={styles.transferButton}
                  />
                </>
              )}

              <View style={[styles.comingSoonBox, { backgroundColor: colors.surface }]}>
                <Ionicons name="construct-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.comingSoonText, { color: colors.textSecondary }]}>
                  Editing the group's name, amount, and frequency isn't available yet -- coming in a
                  future update.
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
      <CustomTabBar groupId={groupId ?? ''} activeTab="more" />
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
  retryButton: {
    marginTop: Spacing.md,
  },
  restrictedText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.regular,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.semibold,
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  sectionHint: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.bold,
  },
  memberTextBlock: {
    flex: 1,
  },
  memberName: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.semibold,
  },
  memberMeta: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    marginTop: 2,
  },
  transferButton: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  comingSoonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: Radius.card,
    padding: Spacing.lg,
  },
  comingSoonText: {
    flex: 1,
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    lineHeight: 18,
  },
});
