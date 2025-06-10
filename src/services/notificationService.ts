import { supabase } from '@/integrations/supabase/client';
import { Notification, NotificationSummary, NotificationType } from '@/types/notification';

// Helper function to map database row to TypeScript interface
const mapDbNotificationToInterface = (dbRow: any): Notification => {
  return {
    id: dbRow.id,
    user_id: dbRow.user_id,
    title: dbRow.title,
    message: dbRow.message,
    type: mapDbTypeToInterface(dbRow.notification_type) as NotificationType,
    link: dbRow.url,
    is_read: dbRow.status === 'sent', // Map status to is_read (sent = read)
    is_dismissed: false, // Default since this field doesn't exist in DB
    source: 'system', // Default since this field doesn't exist in DB
    related_id: null, // Default since this field doesn't exist in DB
    created_at: dbRow.created_at,
    expires_at: null // Default since this field doesn't exist in DB
  };
};

// Helper function to map database notification_type to interface type
const mapDbTypeToInterface = (dbType: string): NotificationType => {
  // Map database notification_type to interface NotificationType
  switch (dbType) {
    case 'push':
    case 'email':
    case 'both':
      return 'info'; // Default to info for these types
    default:
      return 'info';
  }
};

// Fetch all user notifications
export const fetchUserNotifications = async (
  limit = 50,
  offset = 0,
  includeRead = false,
  includeDismissed = false
): Promise<Notification[]> => {
  try {
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return [];
    }
    
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id) // Filter by the current user's ID
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);
    
    // Filter by read status if required (map to database status field)
    if (!includeRead) {
      query = query.neq('status', 'sent'); // Only show non-sent (unread) notifications
    }
    
    // Skip dismissed filter since column doesn't exist in DB
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
    
    // Map database rows to TypeScript interface
    return (data || []).map(mapDbNotificationToInterface);
  } catch (error) {
    console.error('Error in fetchUserNotifications:', error);
    throw error;
  }
};

// Get notification summary for the user (unread count and recent notifications)
export const getNotificationSummary = async (limit = 5): Promise<NotificationSummary> => {
  try {
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return { unread: 0, recent: [] };
    }
    
    // Get unread count (map to database status field)
    const { count: unreadCount, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id) // Filter by the current user's ID
      .neq('status', 'sent'); // Count non-sent (unread) notifications
    
    if (countError) {
      console.error('Error fetching notification count:', countError);
      throw countError;
    }
    
    // Get recent notifications
    const { data: recentNotifications, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id) // Filter by the current user's ID
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (fetchError) {
      console.error('Error fetching recent notifications:', fetchError);
      throw fetchError;
    }
    
    // Map database rows to TypeScript interface
    return {
      unread: unreadCount || 0,
      recent: (recentNotifications || []).map(mapDbNotificationToInterface),
    };
  } catch (error) {
    console.error('Error in getNotificationSummary:', error);
    throw error;
  }
};

// Mark notification as read (update database status field)
export const markNotificationAsRead = async (
  notificationId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ status: 'sent' }) // Map is_read=true to status='sent'
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

// Mark all notifications as read (update database status field)
export const markAllNotificationsAsRead = async (): Promise<void> => {
  try {
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return;
    }
    
    const { error } = await supabase
      .from('notifications')
      .update({ status: 'sent' }) // Map is_read=true to status='sent'
      .eq('user_id', user.id) // Filter by the current user's ID
      .neq('status', 'sent'); // Only update unread notifications
    
    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error);
    throw error;
  }
};

// Mark notification as dismissed (since column doesn't exist, we'll delete it)
export const dismissNotification = async (
  notificationId: string
): Promise<void> => {
  try {
    // Since is_dismissed column doesn't exist, we'll delete the notification
    const { error } = await supabase
      .from('notifications')
      .delete()
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
    // Map interface fields to database fields
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        title,
        message,
        url: link, // Map link to url
        notification_type: 'push', // Map type to notification_type (use push as default)
        status: 'pending' // Default status
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
    
    // Map database row back to TypeScript interface
    return mapDbNotificationToInterface(data);
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