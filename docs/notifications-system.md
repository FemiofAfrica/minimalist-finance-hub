# Notification System

This document explains the notification system implemented in the Kpege application.

## Features

1. **In-app Notifications**
   - Users receive notifications within the application
   - Notification bell icon in header with badge for unread notifications
   - Notifications are stored in the database for persistence

2. **Subscription Expiry Reminders**
   - Automatic notifications when subscriptions are about to renew
   - Reminder days configurable per subscription
   - Daily checking via Supabase Edge Function and in-app checks

3. **Admin Notifications**
   - Admin users can send notifications to specific users or all users
   - Customizable notification title, message, type, and expiry

## System Architecture

### Database

The system uses a `notifications` table with the following structure:

- `notification_id`: Unique identifier for the notification
- `user_id`: User who should receive the notification
- `title`: Short notification title
- `message`: Detailed notification message
- `type`: Type of notification (info, warning, success, error)
- `link`: Optional link to navigate to when notification is clicked
- `is_read`: Whether the notification has been read by the user
- `is_dismissed`: Whether the notification has been dismissed by the user
- `source`: Source of the notification (subscription, system, admin)
- `related_id`: ID of the related entity (e.g., subscription_id)
- `created_at`: When the notification was created
- `expires_at`: When the notification should expire/disappear

### Components

1. **NotificationContext**
   - Manages notification state across the application
   - Provides functions for marking notifications as read/dismissed
   - Listens for real-time notifications via Supabase

2. **NotificationBell**
   - Displays notification count and recent notifications
   - Allows viewing and managing notifications

3. **Admin Interface**
   - Settings page section for admin users
   - Interface to send notifications to all users

### Backend Functions

1. **Database Functions**
   - `send_notification_to_user`: Sends a notification to a specific user
   - `send_notification_to_all_users`: Sends a notification to all users
   - `check_subscription_renewals`: Checks for upcoming subscription renewals

2. **Edge Function**
   - `send-subscription-reminders`: Server-side function to check for subscription renewals

## Workflow

1. **Creating Notifications**
   - Automatic: Subscription reminders when due date is approaching
   - Admin: From the admin panel in Settings
   - System: Can be created by any part of the application

2. **Displaying Notifications**
   - Notifications appear in the bell dropdown
   - Unread count displayed on bell icon
   - Toast notifications for newly received notifications

3. **Managing Notifications**
   - Mark as read: When clicked or via "Mark all as read"
   - Dismiss: Remove from notification list
   - Expiry: Automatically removed after expiry date

## Usage

### For Users

- Subscription reminders will appear automatically based on reminder_days
- Click notifications to navigate to relevant pages
- Dismiss or mark as read to manage notification list

### For Admins

1. Navigate to Settings > Admin > Notification Management
2. Fill out the notification form:
   - Title
   - Message
   - Type (info, success, warning, error)
   - Link (optional)
   - Expiry (days)
3. Click "Send to All Users"

## Technical Implementation

- Real-time updates using Supabase realtime subscriptions
- Database-level security with Row Level Security
- Admin functions secured with proper permission checks 