import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Mail, Settings } from 'lucide-react';

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading');
  const [unsubscribeType, setUnsubscribeType] = useState<string>('');

  useEffect(() => {
    const token = searchParams.get('token');
    const type = searchParams.get('type') || 'all';
    
    if (!token) {
      setStatus('invalid');
      return;
    }
    
    setUnsubscribeType(type);
    handleUnsubscribe(token, type);
  }, [searchParams]);

  const handleUnsubscribe = async (token: string, type: string) => {
    try {
      const { data, error } = await supabase.rpc('unsubscribe_from_emails', {
        p_token: token,
        p_type: type
      });

      if (error) {
        console.error('Unsubscribe error:', error);
        setStatus('error');
        return;
      }

      if (data) {
        setStatus('success');
      } else {
        setStatus('invalid');
      }
    } catch (error) {
      console.error('Unsubscribe error:', error);
      setStatus('error');
    }
  };

  const getUnsubscribeTypeText = (type: string) => {
    switch (type) {
      case 'subscription_reminders':
        return 'subscription reminder emails';
      case 'all':
        return 'all email notifications';
      default:
        return 'email notifications';
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 animate-spin">
                <Mail className="w-full h-full text-muted-foreground" />
              </div>
              <CardTitle>Processing Request...</CardTitle>
              <CardDescription>
                We're updating your email preferences.
              </CardDescription>
            </CardHeader>
          </Card>
        );

      case 'success':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <CardTitle className="text-green-700">Successfully Unsubscribed</CardTitle>
              <CardDescription>
                You've been unsubscribed from {getUnsubscribeTypeText(unsubscribeType)}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground text-center">
                {unsubscribeType === 'subscription_reminders' ? (
                  <p>You'll no longer receive email reminders about subscription renewals, but you'll still see them in your Kpege dashboard.</p>
                ) : (
                  <p>You'll no longer receive any email notifications from Kpege, but you can still access all features in your dashboard.</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button asChild className="w-full">
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Email Preferences
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'error':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <CardTitle className="text-red-700">Error</CardTitle>
              <CardDescription>
                We encountered an error while processing your request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground text-center">
                <p>Please try again or contact support if the problem persists.</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button asChild className="w-full">
                  <Link to="/settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Email Preferences
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <a href="mailto:hello@kpege.com">Contact Support</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'invalid':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <CardTitle className="text-red-700">Invalid Link</CardTitle>
              <CardDescription>
                This unsubscribe link is invalid or has expired.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground text-center">
                <p>Please use the unsubscribe link from a recent email, or manage your preferences directly in your account settings.</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button asChild className="w-full">
                  <Link to="/settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Email Preferences
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {renderContent()}
        
        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Need help? <a href="mailto:hello@kpege.com" className="text-green-600 hover:underline">Contact support</a></p>
        </div>
      </div>
    </div>
  );
} 