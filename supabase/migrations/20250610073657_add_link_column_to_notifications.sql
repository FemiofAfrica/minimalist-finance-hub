-- Add missing link column to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;

-- Create index for link column for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_link ON notifications(link) WHERE link IS NOT NULL;

-- Update the RLS policies to include the link column
COMMENT ON COLUMN notifications.link IS 'Optional URL to navigate to when notification is clicked';
