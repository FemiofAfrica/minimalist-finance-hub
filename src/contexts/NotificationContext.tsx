import React, { createContext, useContext, useEffect, useState } from 'react';
import { Notification, NotificationSummary } from '@/types/notification';
import { 
  fetchUserNotifications, 
  getNotificationSummary, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  dismissNotification,
  checkSubscriptionRenewals
} from '@/services/notificationService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (notificationId: string) => Promise<void>;
  handleNotificationClick: (notification: Notification) => void;
  showNotification: boolean;
  setShowNotification: (show: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check for new notifications when the component mounts and when the user changes
  useEffect(() => {
    if (user) {
      fetchNotifications();
      checkForSubscriptionRenewals();
      
      // Set up real-time subscription for new notifications
      const channel = subscribeToNotifications();
      
      return () => {
        // Clean up subscription when component unmounts
        channel.unsubscribe();
      };
    }
  }, [user]);

  // Function to check for subscription renewals
  const checkForSubscriptionRenewals = async () => {
    try {
      const count = await checkSubscriptionRenewals();
      if (count > 0) {
        console.log(`Created ${count} subscription renewal notifications`);
        fetchNotifications(); // Refresh notifications
      }
    } catch (error) {
      console.error('Error checking subscription renewals:', error);
    }
  };

  // Function to subscribe to real-time notifications
  const subscribeToNotifications = () => {
    const channel = supabase
      .channel('notifications-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user?.id}`,
      }, payload => {
        // Handle new notification - map database row to interface
        const dbRow = payload.new;
        const newNotification: Notification = {
          id: dbRow.id,
          user_id: dbRow.user_id,
          title: dbRow.title,
          message: dbRow.message,
          type: 'info', // Default type
          link: dbRow.url, // Map url to link
          is_read: dbRow.status === 'sent', // Map status to is_read
          is_dismissed: false,
          source: 'system',
          related_id: null,
          created_at: dbRow.created_at,
          expires_at: null
        };
        
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show toast for new notification
        toast({
          title: newNotification.title,
          description: newNotification.message,
          variant: newNotification.type === 'error' ? 'destructive' : 'default',
        });
      })
      .subscribe();

    return channel;
  };

  // Function to fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Get notification summary
      const summary: NotificationSummary = await getNotificationSummary(10);
      setNotifications(summary.recent);
      setUnreadCount(summary.unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to mark a notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
      
      // Decrement unread count if the notification was unread
      const wasUnread = notifications.find(
        n => n.id === notificationId && !n.is_read
      );
      
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Function to mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Function to dismiss a notification
  const dismiss = async (notificationId: string) => {
    try {
      await dismissNotification(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
      
      // Decrement unread count if the notification was unread
      const wasUnread = notifications.find(
        n => n.id === notificationId && !n.is_read
      );
      
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  // Function to handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    markAsRead(notification.id);
    
    // Navigate if link is provided
    if (notification.link) {
      navigate(notification.link);
    }
    
    // Close notification panel
    setShowNotification(false);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        dismiss,
        handleNotificationClick,
        showNotification,
        setShowNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
} 