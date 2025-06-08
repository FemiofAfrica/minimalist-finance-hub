import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// VAPID configuration
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!

interface PushNotificationRequest {
  title: string
  message: string
  url?: string
  targetType: 'single' | 'segment'
  userId?: string
  segment?: 'time_based' | 'all_users' | 'super_admins'
  duration?: number
  durationUnit?: 'hours' | 'days' | 'weeks' | 'months'
  shouldTriggerEmail?: boolean
}

interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

// JWT web token for VAPID
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Send web push notification
async function sendWebPushNotification(subscription: PushSubscription, payload: string): Promise<boolean> {
  try {
    const privateKey = urlBase64ToUint8Array(VAPID_PRIVATE_KEY)
    
    // Create JWT header
    const jwtHeader = {
      typ: 'JWT',
      alg: 'ES256'
    }

    // Create JWT payload
    const jwtPayload = {
      aud: new URL(subscription.endpoint).origin,
      exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
      sub: 'mailto:admin@yourapp.com'
    }

    // For simplicity, we'll use a basic approach here
    // In production, you might want to use a proper JWT library
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Authorization': `vapid t=${VAPID_PUBLIC_KEY}, k=${VAPID_PUBLIC_KEY}`,
        'TTL': '2419200',
      },
      body: payload,
    })

    return response.ok
  } catch (error) {
    console.error('Failed to send push notification:', error)
    return false
  }
}

// Send email notification via Brevo
async function sendEmailNotification(userEmail: string, title: string, message: string, url?: string): Promise<boolean> {
  try {
    const emailPayload = {
      to: [{ email: userEmail }],
      templateId: 2, // Your Brevo template ID
      params: {
        title: title,
        message: message,
        url: url || '#',
        year: new Date().getFullYear()
      }
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify(emailPayload),
    })

    return response.ok
  } catch (error) {
    console.error('Failed to send email notification:', error)
    return false
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { title, message, url, targetType, userId, segment, duration, durationUnit, shouldTriggerEmail }: PushNotificationRequest = await req.json()

    let subscriptions: PushSubscription[] = []
    let targetUsers: any[] = []

    // Get target subscriptions based on type
    if (targetType === 'single' && userId) {
      // Single user notification
      const { data: userSubscriptions } = await supabaseClient
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)

      subscriptions = userSubscriptions || []

      // Get user details for email
      if (shouldTriggerEmail) {
        const { data: user } = await supabaseClient.auth.admin.getUserById(userId)
        if (user.user) {
          targetUsers = [user.user]
        }
      }
    } else if (targetType === 'segment') {
      if (segment === 'super_admins') {
        // Super admins only
        const { data: adminUsers } = await supabaseClient
          .from('user_profiles')
          .select('*')
          .or('raw_user_meta_data->>is_super_admin.eq.true,user_metadata->>is_super_admin.eq.true')

        if (adminUsers) {
          const adminUserIds = adminUsers.map(u => u.id)
          
          const { data: adminSubscriptions } = await supabaseClient
            .from('push_subscriptions')
            .select('*')
            .in('user_id', adminUserIds)
            .eq('is_active', true)

          subscriptions = adminSubscriptions || []
          targetUsers = adminUsers
        }
      } else if (segment === 'all_users') {
        // All users
        const { data: allSubscriptions } = await supabaseClient
          .from('push_subscriptions')
          .select('*')
          .eq('is_active', true)

        subscriptions = allSubscriptions || []

        if (shouldTriggerEmail) {
          const { data: allUsers } = await supabaseClient
            .from('user_profiles')
            .select('*')
            .limit(1000) // Reasonable limit
          targetUsers = allUsers || []
        }
      } else if (segment === 'time_based' && duration && durationUnit) {
        // Time-based users
        let intervalString = `${duration} ${durationUnit}`
        
        const { data: recentUsers } = await supabaseClient
          .from('user_profiles')
          .select('*')
          .gte('created_at', `now() - interval '${intervalString}'`)

        if (recentUsers) {
          const recentUserIds = recentUsers.map(u => u.id)
          
          const { data: recentSubscriptions } = await supabaseClient
            .from('push_subscriptions')
            .select('*')
            .in('user_id', recentUserIds)
            .eq('is_active', true)

          subscriptions = recentSubscriptions || []
          targetUsers = recentUsers
        }
      }
    }

    // Create notification payload
    const notificationPayload = JSON.stringify({
      title,
      body: message,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: {
        url: url || '/',
        timestamp: Date.now()
      },
      actions: url ? [
        {
          action: 'open',
          title: 'Open',
          icon: '/icon-192x192.png'
        }
      ] : undefined
    })

    // Send push notifications
    let pushSuccessCount = 0
    let pushFailureCount = 0

    for (const subscription of subscriptions) {
      try {
        const success = await sendWebPushNotification(subscription, notificationPayload)
        if (success) {
          pushSuccessCount++
        } else {
          pushFailureCount++
        }

        // Log notification
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: subscription.user_id,
            title,
            message,
            url,
            notification_type: 'push',
            status: success ? 'sent' : 'failed',
            sent_at: success ? new Date().toISOString() : null,
            error_message: success ? null : 'Push notification failed'
          })
      } catch (error) {
        pushFailureCount++
        console.error('Push notification error:', error)
      }
    }

    // Send email notifications if requested
    let emailSuccessCount = 0
    let emailFailureCount = 0

    if (shouldTriggerEmail && targetUsers.length > 0) {
      for (const user of targetUsers) {
        try {
          const success = await sendEmailNotification(user.email, title, message, url)
          if (success) {
            emailSuccessCount++
          } else {
            emailFailureCount++
          }

          // Log email notification
          await supabaseClient
            .from('notifications')
            .insert({
              user_id: user.id,
              title,
              message,
              url,
              notification_type: 'email',
              status: success ? 'sent' : 'failed',
              sent_at: success ? new Date().toISOString() : null,
              error_message: success ? null : 'Email notification failed'
            })
        } catch (error) {
          emailFailureCount++
          console.error('Email notification error:', error)
        }
      }
    }

    const response = {
      success: true,
      push: {
        sent: pushSuccessCount,
        failed: pushFailureCount,
        total: subscriptions.length
      },
      email: shouldTriggerEmail ? {
        sent: emailSuccessCount,
        failed: emailFailureCount,
        total: targetUsers.length
      } : null,
      message: `Notifications sent successfully. Push: ${pushSuccessCount}/${subscriptions.length}${shouldTriggerEmail ? `, Email: ${emailSuccessCount}/${targetUsers.length}` : ''}`
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Notification function error:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to send notifications', 
      details: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}) 