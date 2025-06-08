import { supabase } from '@/integrations/supabase/client';
import { Notification, NotificationSummary, NotificationType } from '@/types/notification';

// Fetch all user notifications
export const fetchUserNotifications = async (
  limit = 50,
  offset = 0,
  includeRead = false,
  includeDismissed = false
): Promise<Notification[]> => {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);
    
    // Filter by read status if required
    if (!includeRead) {
      query = query.eq('is_read', false);
    }
    
    // Filter by dismissed status if required
    if (!includeDismissed) {
      query = query.eq('is_dismissed', false);
    }
    
    // Filter expired notifications
    query = query.or('expires_at.is.null,expires_at.gt.now()');
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
    
    return (data || []) as Notification[];
  } catch (error) {
    console.error('Error in fetchUserNotifications:', error);
    throw error;
  }
};

// Get notification summary for the user (unread count and recent notifications)
export const getNotificationSummary = async (limit = 5): Promise<NotificationSummary> => {
  try {
    // Get unread count
    const { count: unreadCount, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .eq('is_dismissed', false)
      .or('expires_at.is.null,expires_at.gt.now()');
    
    if (countError) {
      console.error('Error fetching notification count:', countError);
      throw countError;
    }
    
    // Get recent notifications
    const { data: recentNotifications, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_dismissed', false)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (fetchError) {
      console.error('Error fetching recent notifications:', fetchError);
      throw fetchError;
    }
    
    return {
      unread: unreadCount || 0,
      recent: (recentNotifications || []) as Notification[],
    };
  } catch (error) {
    console.error('Error in getNotificationSummary:', error);
    throw error;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (
  notificationId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    
    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    throw error;
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);
    
    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error);
    throw error;
  }
};

// Mark notification as dismissed (hide it)
export const dismissNotification = async (
  notificationId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_dismissed: true })
      .eq('id', notificationId);
    
    if (error) {
      console.error('Error dismissing notification:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in dismissNotification:', error);
    throw error;
  }
};

// Create a new notification (mostly for testing, typically done by backend)
export const createNotification = async (
  title: string,
  message: string,
  type: NotificationType = 'info',
  link?: string,
  source: string = 'system',
  relatedId?: string,
  expiresIn?: number // days
): Promise<Notification> => {
  try {
    // Calculate expiry date if provided
    let expiresAt = null;
    if (expiresIn) {
      const date = new Date();
      date.setDate(date.getDate() + expiresIn);
      expiresAt = date.toISOString();
    }
    
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        title,
        message,
        type,
        link,
        source,
        related_id: relatedId,
        expires_at: expiresAt
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
    
    return data as Notification;
  } catch (error) {
    console.error('Error in createNotification:', error);
    throw error;
  }
};

// Admin function to send a notification to a specific user
// Note: This uses the database function which will only succeed if the caller is an admin
export const sendNotificationToUser = async (
  userId: string,
  title: string,
  message: string,
  type: NotificationType = 'info',
  link?: string,
  expiresIn?: number // days
): Promise<string> => {
  try {
    // Calculate expiry date if provided
    let expiresAt = null;
    if (expiresIn) {
      const date = new Date();
      date.setDate(date.getDate() + expiresIn);
      expiresAt = date.toISOString();
    }
    
    const { data, error } = await supabase.rpc('send_notification_to_user', {
      p_user_id: userId,
      p_title: title,
      p_message: message,
      p_type: type,
      p_link: link,
      p_source: 'admin',
      p_expires_at: expiresAt
    });
    
    if (error) {
      console.error('Error sending notification to user:', error);
      throw error;
    }
    
    return data as string;
  } catch (error) {
    console.error('Error in sendNotificationToUser:', error);
    throw error;
  }
};

// Admin function to send a notification to all users
// Note: This uses the database function which will only succeed if the caller is an admin
export const sendNotificationToAllUsers = async (
  title: string,
  message: string,
  type: NotificationType = 'info',
  link?: string,
  expiresIn?: number // days
): Promise<number> => {
  try {
    // Calculate expiry date if provided
    let expiresAt = null;
    if (expiresIn) {
      const date = new Date();
      date.setDate(date.getDate() + expiresIn);
      expiresAt = date.toISOString();
    }
    
    const { data, error } = await supabase.rpc('send_notification_to_all_users', {
      p_title: title,
      p_message: message,
      p_type: type,
      p_link: link,
      p_source: 'admin',
      p_expires_at: expiresAt
    });
    
    if (error) {
      console.error('Error sending notification to all users:', error);
      throw error;
    }
    
    return data as number;
  } catch (error) {
    console.error('Error in sendNotificationToAllUsers:', error);
    throw error;
  }
};

// Manual function to check for subscription renewals
// This can be called on app load or at specific times
export const checkSubscriptionRenewals = async (): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('check_subscription_renewals');
    
    if (error) {
      console.error('Error checking subscription renewals:', error);
      throw error;
    }
    
    return data as number;
  } catch (error) {
    console.error('Error in checkSubscriptionRenewals:', error);
    throw error;
  }
}; 