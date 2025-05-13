import React from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { BellIcon, CheckIcon, XIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Notification } from '@/types/notification';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { formatDistanceToNow } from 'date-fns';

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAllAsRead,
    handleNotificationClick,
    dismiss
  } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h2 className="font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead()}
              className="h-auto p-1 text-xs"
            >
              Mark all as read
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
            <BellIcon className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No notifications</p>
            <p className="text-xs text-muted-foreground">
              You don't have any notifications at the moment.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.notification_id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                  onDismiss={() => dismiss(notification.notification_id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onDismiss: () => void;
}

function NotificationItem({ notification, onClick, onDismiss }: NotificationItemProps) {
  // Convert date string to a Date object
  const createdAt = new Date(notification.created_at);
  
  // Format the time based on how long ago it was
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });
  
  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 hover:bg-muted/50 cursor-pointer",
        notification.is_read ? "opacity-60" : "font-medium"
      )}
    >
      <div className="flex-1" onClick={onClick}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{notification.title}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="h-5 w-5 rounded-full p-0 opacity-50 hover:opacity-100"
            >
              <XIcon className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{notification.message}</p>
        
        {/* Show indicators based on notification type */}
        {!notification.is_read && (
          <div className="mt-1 flex items-center gap-1">
            <div className={cn(
              "h-2 w-2 rounded-full",
              notification.type === 'info' && "bg-blue-500",
              notification.type === 'warning' && "bg-amber-500",
              notification.type === 'success' && "bg-green-500",
              notification.type === 'error' && "bg-destructive"
            )} />
            <span className="text-xs">{notification.type === 'warning' ? 'action needed' : 'new'}</span>
          </div>
        )}
      </div>
    </div>
  );
} 