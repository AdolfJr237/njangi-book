import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomTabBar } from '@/components/CustomTabBar';
import { InviteCodeCard } from '@/components/InviteCodeCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { getGroup } from '@/services/groupsApi';
import { getMembers } from '@/services/membersApi';

function getInitials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

const MENU_ITEMS = [
  { key: 'notifications', icon: 'notifications-outline' as const, label: 'Notifications' },
  { key: 'reports', icon: 'bar-chart-outline' as const, label: 'Reports & Analytics' },
  { key: 'password', icon: 'lock-closed-outline' as const, label: 'Change Password' },
  { key: 'group-settings', icon: 'create-outline' as const, label: 'Group Settings' },
];

// This screen doubles as the More tab's landing page -- no separate
// "More" hub mockup exists, and Notifications/Reports/Group Settings all
// hang off this Profile screen in the Figma reference, so it IS the
// More tab. Same pattern as Welfare Fund standing in for Funds.
//
// Notifications, Reports, and Group Settings themselves are still
// Category B (their own backends don't exist yet) -- only what's ON
// this screen directly (identity, per-group role, invite code, logout)
// is real here.
export default function Profile() {
  const { colors } = useTheme();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { user, token, signOut } = useAuth();

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<'treasurer' | 'member' | null>(null);

  const loadGroupContext = useCallback(async () => {
    if (!groupId || !token) return;
    try {
      const [group, members] = await Promise.all([
        getGroup(groupId, token),
        getMembers(groupId, token),
      ]);
      setInviteCode(group.invite_code);
      setMyRole(members.my_role);
    } catch {
      // Non-critical for this screen -- the invite code and treasurer-only
      // menu items just stay hidden if this fails, rather than blocking
      // the whole Profile screen with an error state over a name and
      // phone number that are already known locally.
      setInviteCode(null);
      setMyRole(null);
    }
  }, [groupId, token]);

  useFocusEffect(
    useCallback(() => {
      loadGroupContext();
    }, [loadGroupContext])
  );

  const isTreasurer = myRole === 'treasurer';
  const visibleMenuItems = MENU_ITEMS.filter((item) => item.key !== 'group-settings' || isTreasurer);

  const handleMenuPress = (key: string) => {
    if (key === 'notifications') {
      router.push('/(app)/notifications');
    } else if (key === 'reports') {
      router.push({ pathname: '/group/[groupId]/reports', params: { groupId } });
    } else if (key === 'group-settings') {
      router.push({ pathname: '/group/[groupId]/group-settings', params: { groupId } });
    } else if (key === 'password') {
      router.push({ pathname: '/change-password', params: { groupId } });
    }
  };

  const handleLogout = () => {
    Alert.alert('Log out?', 'You can log back in anytime with your phone number and password.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (!user) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader title="Profile" onBack={() => router.replace('/(app)/dashboard')} />

      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{getInitials(user.full_name)}</Text>
            </View>
            <Text style={[styles.name, { color: colors.text }]}>{user.full_name}</Text>
            <Text style={[styles.phone, { color: colors.textSecondary }]}>{user.phone_number}</Text>
            {isTreasurer && (
              <View style={[styles.treasurerPill, { backgroundColor: `${colors.warning}1A` }]}>
                <Text style={[styles.treasurerPillText, { color: colors.warning }]}>Treasurer</Text>
              </View>
            )}
          </View>

          {isTreasurer && inviteCode && <InviteCodeCard code={inviteCode} />}

          {visibleMenuItems.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => handleMenuPress(item.key)}
              style={[styles.menuRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
              <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          ))}

          <Pressable
            onPress={handleLogout}
            style={[styles.menuRow, styles.logoutRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={[styles.menuLabel, { color: colors.danger }]}>Log Out</Text>
          </Pressable>
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
  profileCard: {
    alignItems: 'center',
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: Typography.size.xl,
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
    marginBottom: Spacing.sm,
  },
  treasurerPill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  treasurerPillText: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.semibold,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: Typography.size.md,
    fontFamily: Typography.family.semibold,
  },
  logoutRow: {
    marginTop: Spacing.sm,
  },
});
