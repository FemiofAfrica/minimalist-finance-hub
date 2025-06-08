import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createNotification } from '@/services/notificationService';
import { toast } from 'sonner';

const CreateTestNotification: React.FC = () => {
  const [title, setTitle] = useState('Test Notification with Link');
  const [message, setMessage] = useState('This notification has a link to view details. Click to see the button.');
  const [link, setLink] = useState('/settings');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateNotification = async () => {
    if (!title || !message) {
      toast.error('Please provide both title and message');
      return;
    }

    setIsLoading(true);
    try {
      const notification = await createNotification(
        title,
        message,
        'info',
        link || undefined
      );
      
      toast.success('Test notification created successfully!');
      console.log('Created notification:', notification);
    } catch (error) {
      console.error('Error creating test notification:', error);
      toast.error('Failed to create test notification');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Test Notification with Link</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Input
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Notification message"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="link">Link (URL)</Label>
            <Input
              id="link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="e.g., /settings"
            />
            <p className="text-xs text-muted-foreground">
              This will make the "View Details" button appear
            </p>
          </div>
          
          <Button 
            onClick={handleCreateNotification} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Creating...' : 'Create Test Notification with Link'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreateTestNotification; 