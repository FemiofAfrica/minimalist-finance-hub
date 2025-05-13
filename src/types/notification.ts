// Define notification types
export type NotificationType = 'info' | 'warning' | 'success' | 'error';
export type NotificationSource = 'subscription' | 'system' | 'admin' | string;

export interface Notification {
  notification_id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  source: NotificationSource;
  related_id?: string | null;
  created_at: string;
  expires_at?: string | null;
}

export interface NotificationSummary {
  unread: number;
  recent: Notification[];
} 