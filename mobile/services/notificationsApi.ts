import { apiRequest } from '@/services/apiClient';

// Mirrors backend/app/schemas/notification.py's NotificationOut.
export type NotificationType =
  | 'contribution_recorded'
  | 'contribution_reversed'
  | 'your_turn_to_collect'
  | 'cycle_closed_owing'
  | 'dispute_raised'
  | 'cycle_closed_announcement';

export type NotificationItem = {
  id: number;
  type: NotificationType;
  message: string;
  group_id: number;
  group_name: string;
  is_read: boolean;
  // Null for every type except contribution_recorded -- that's the
  // only one with a confirm/dispute loop.
  confirmation_status: 'pending' | 'confirmed' | 'disputed' | null;
  dispute_reason: string | null;
  created_at: string;
};

// Global, not scoped to one group -- a user sees every notification
// across every group they belong to in one place, matching
// NjangiBook_Navigation_UX.md's top-level /notifications.
export function getNotifications(token: string) {
  return apiRequest<NotificationItem[]>('/notifications', { token });
}

export function getUnreadCount(token: string) {
  return apiRequest<{ unread_count: number }>('/notifications/unread-count', { token });
}

export function markNotificationRead(notificationId: number, token: string) {
  return apiRequest<NotificationItem>(`/notifications/${notificationId}/read`, {
    method: 'POST',
    token,
  });
}

export function confirmNotification(notificationId: number, token: string) {
  return apiRequest<NotificationItem>(`/notifications/${notificationId}/confirm`, {
    method: 'POST',
    token,
  });
}

// Raises a flag only -- never touches the underlying contribution.
// The treasurer decides separately, through reverse_contribution,
// whether the dispute is legitimate.
export function disputeNotification(notificationId: number, token: string, reason?: string) {
  return apiRequest<NotificationItem>(`/notifications/${notificationId}/dispute`, {
    method: 'POST',
    token,
    body: { reason: reason || null },
  });
}
