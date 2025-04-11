import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';

export default function Settings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [website, setWebsite] = useState<string | null>(null);
  const [avatar_url, setAvatarUrl] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const getProfile = async () => {
      setLoading(true);
      try {
        const { data: user, error: userError } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        setEmail(user.user?.email || null);

        const { data, error, status } = await supabase
          .from('profiles')
          .select(`username, website, avatar_url`)
          .eq('id', user.user?.id)
          .single()

        if (error && status !== 406) {
          throw error
        }

        if (data) {
          setUsername(data.username)
          setWebsite(data.website)
          setAvatarUrl(data.avatar_url)
        }
      } catch (error: any) {
        alert(error.message)
      } finally {
        setLoading(false)
      }
    }

    getProfile()
  }, [])

  async function updateProfile({ username, website, avatar_url }: { username: string; website: string; avatar_url: string }) {
    try {
      setLoading(true)

      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError) {
          throw userError;
      }

      const updates = {
        id: user.user?.id,
        username,
        website,
        avatar_url,
        updated_at: new Date(),
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(updates, { onConflict: 'id' })

      if (error) {
        throw error
      }
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ padding: '50px 0 100px 0' }}>
      <div className="form-widget">
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="text" value={email || ''} disabled />
        </div>
        <div>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username || ''}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="website">Website</label>
          <input
            id="website"
            type="url"
            value={website || ''}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <div>
          <button
            className="button primary block"
            onClick={() => updateProfile({ username: username || '', website: website || '', avatar_url: avatar_url || '' })}//updateProfile({ username, website, avatar_url })
            disabled={loading}
          >
            {loading ? 'Saving ...' : 'Update profile'}
          </button>
        </div>

        <div>
          <button className="button block" onClick={() => supabase.auth.signOut()} disabled={loading}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}