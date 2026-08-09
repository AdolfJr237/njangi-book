import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Pill } from '@/components/Pill';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Skeleton } from '@/components/Skeleton';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { ApiError } from '@/services/apiClient';
import {
  NotificationItem,
  NotificationType,
  confirmNotification,
  disputeNotification,
  getNotifications,
  markNotificationRead,
} from '@/services/notificationsApi';

const TYPE_META: Record<NotificationType, { icon: keyof typeof Ionicons.glyphMap; tone: 'success' | 'danger' | 'warning' | 'neutral' }> = {
  contribution_recorded: { icon: 'wallet-outline', tone: 'success' },
  contribution_reversed: { icon: 'arrow-undo-outline', tone: 'danger' },
  your_turn_to_collect: { icon: 'trophy-outline', tone: 'neutral' },
  cycle_closed_owing: { icon: 'alert-circle-outline', tone: 'warning' },
  dispute_raised: { icon: 'flag-outline', tone: 'warning' },
  // The group-wide "cycle closed, X is now collecting" fallback -- only
  // ever sent to a member with no personal stake (not the new
  // collector, not left owing), so it gets the same neutral tone as a
  // plain reminder, not a money-state color.
  cycle_closed_announcement: { icon: 'sync-outline', tone: 'neutral' },
};

function formatDateTime(isoDateTime: string) {
  return new Date(isoDateTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

type LoadState = 'loading' | 'error' | 'success';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<number | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    setLoadState('loading');
    try {
      const data = await getNotifications(token);
      setNotifications(data);
      setLoadState('success');
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
      setLoadState('error');
    }
  }, [token]);

  // useFocusEffect -- a new notification (someone recorded your
  // payment, closed a cycle, etc.) should show up the moment you open
  // this screen, not just on first mount.
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const replaceNotification = (updated: NotificationItem) => {
    setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
  };

  const handleRowPress = async (item: NotificationItem) => {
    if (item.is_read || !token) return;
    try {
      const updated = await markNotificationRead(item.id, token);
      replaceNotification(updated);
    } catch {
      // Non-critical -- read state is a convenience, not worth an error banner.
    }
  };

  const handleConfirm = async (item: NotificationItem) => {
    if (!token) return;
    setActioningId(item.id);
    try {
      const updated = await confirmNotification(item.id, token);
      replaceNotification(updated);
    } catch (error) {
      Alert.alert('Could not confirm', error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setActioningId(null);
    }
  };

  const confirmDispute = (item: NotificationItem) => {
    Alert.alert(
      'Dispute this contribution?',
      "The treasurer will be notified that you disagree with this record. This does not undo the payment -- that's a decision only the treasurer can make, after talking it through with you.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Dispute', style: 'destructive', onPress: () => handleDispute(item) },
      ]
    );
  };

  const handleDispute = async (item: NotificationItem) => {
    if (!token) return;
    setActioningId(item.id);
    try {
      const updated = await disputeNotification(item.id, token);
      replaceNotification(updated);
    } catch (error) {
      Alert.alert('Could not dispute', error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader title="Notifications" onBack={() => router.back()} />

      <SafeAreaView edges={['bottom']} style={styles.container}>
        {loadState === 'loading' && (
          <View style={styles.listContent}>
            <Skeleton height={80} borderRadius={Radius.card} style={{ marginBottom: Spacing.md }} />
            <Skeleton height={80} borderRadius={Radius.card} style={{ marginBottom: Spacing.md }} />
            <Skeleton height={80} borderRadius={Radius.card} style={{ marginBottom: Spacing.md }} />
          </View>
        )}

        {loadState === 'error' && (
          <View style={styles.listContent}>
            <Banner message={errorMessage ?? 'Something went wrong.'} tone="danger" />
            <Button label="Retry" variant="outline" onPress={loadNotifications} style={styles.retryButton} />
          </View>
        )}

        {loadState === 'success' && (
          <FlatList
            data={notifications}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyBlock}>
                <Ionicons name="notifications-outline" size={36} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications yet</Text>
                <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                  You'll see it here when a payment is recorded for you, it's your turn to collect,
                  or anything else changes in your groups.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const meta = TYPE_META[item.type];
              const toneColor = {
                success: colors.success,
                danger: colors.danger,
                warning: colors.warning,
                neutral: colors.primary,
              }[meta.tone];
              const isPending = item.confirmation_status === 'pending';
              const isActioning = actioningId === item.id;

              return (
                <Pressable
                  onPress={() => handleRowPress(item)}
                  style={[
                    styles.card,
                    { backgroundColor: colors.card, borderColor: item.is_read ? colors.border : toneColor },
                  ]}
                >
                  <View style={styles.row}>
                    <View style={[styles.iconCircle, { backgroundColor: `${toneColor}1A` }]}>
                      <Ionicons name={meta.icon} size={18} color={toneColor} />
                    </View>
                    <View style={styles.textBlock}>
                      <Text
                        style={[
                          styles.message,
                          { color: colors.text },
                          !item.is_read && styles.messageUnread,
                        ]}
                      >
                        {item.message}
                      </Text>
                      <Text style={[styles.meta, { color: colors.textSecondary }]}>
                        {item.group_name} · {formatDateTime(item.created_at)}
                      </Text>
                    </View>
                    {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                  </View>

                  {item.confirmation_status === 'confirmed' && (
                    <Pill label="Confirmed" tone="success" />
                  )}
                  {item.confirmation_status === 'disputed' && (
                    <View style={styles.disputedBlock}>
                      <Pill label="Disputed" tone="danger" />
                      {item.dispute_reason && (
                        <Text style={[styles.disputeReason, { color: colors.textSecondary }]}>
                          "{item.dispute_reason}"
                        </Text>
                      )}
                    </View>
                  )}

                  {isPending && (
                    <View style={styles.actionsRow}>
                      <Button
                        label="Confirm"
                        onPress={() => handleConfirm(item)}
                        loading={isActioning}
                        disabled={isActioning}
                        style={styles.actionButton}
                      />
                      <Button
                        label="Dispute"
                        variant="outline"
                        onPress={() => confirmDispute(item)}
                        disabled={isActioning}
                        style={styles.actionButton}
                      />
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        )}
      </SafeAreaView>
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
    paddingBottom: Spacing.xxl,
  },
  retryButton: {
    marginTop: Spacing.md,
  },
  emptyBlock: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
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
    lineHeight: 20,
  },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
  },
  message: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.regular,
    lineHeight: 19,
  },
  messageUnread: {
    fontFamily: Typography.family.semibold,
  },
  meta: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    marginTop: Spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  disputedBlock: {
    marginTop: Spacing.sm,
    marginLeft: 48,
    gap: Spacing.xs,
  },
  disputeReason: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginLeft: 48,
  },
  actionButton: {
    flex: 1,
  },
});
