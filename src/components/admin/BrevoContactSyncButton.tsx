import React, { useState } from 'react';
import supabase from '../../integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface BrevoContactSyncButtonProps {
  isAdmin: boolean;
}

// Use the full Supabase Edge Function URL
const EDGE_FUNCTION_URL = 'https://idcgvnwatraddbsppxzl.functions.supabase.co/brevo-contact-sync';

const BrevoContactSyncButton: React.FC<BrevoContactSyncButtonProps> = ({ isAdmin }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        setError('Not authenticated.');
        setLoading(false);
        return;
      }
      const res = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sync failed');
      } else {
        setSuccess('Contacts synced successfully!');
      }
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="flex flex-col items-center">
      <Button
        onClick={handleSync}
        disabled={loading}
        variant="default"
        className="min-w-[200px]"
      >
        {loading ? 'Syncing...' : 'Sync Brevo Contacts'}
      </Button>
      {success && <div className="text-green-600 mt-2">{success}</div>}
      {error && <div className="text-red-600 mt-2">{error}</div>}
    </div>
  );
};

export default BrevoContactSyncButton; 