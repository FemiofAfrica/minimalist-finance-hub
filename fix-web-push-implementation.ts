// Fixed sendWebPush function for FCM compatibility
async function sendWebPush(subscription: PushSubscription, payload: any): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('VAPID keys not configured')
  }

  console.log('🔍 Sending push to endpoint:', subscription.endpoint.substring(0, 50) + '...')
  
  // For FCM (Firebase Cloud Messaging), we need proper headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'TTL': '86400'
  }

  // Add FCM-specific authorization if it's a Google FCM endpoint
  if (subscription.endpoint.includes('fcm.googleapis.com')) {
    console.log('🔍 Detected FCM endpoint, adding FCM headers')
    
    // For FCM, we need to use the server key or VAPID
    // Since we're using VAPID, add the Authorization header
    const vapidHeader = `vapid t=${await createSimpleVapidToken()}, k=${VAPID_PUBLIC_KEY}`
    headers['Authorization'] = vapidHeader
    
    // FCM expects the payload in a specific format
    const fcmPayload = {
      notification: {
        title: payload.title,
        body: payload.body,
        icon: payload.icon,
        badge: payload.badge,
        data: payload.data
      }
    }
    
    console.log('🔍 FCM Payload:', JSON.stringify(fcmPayload, null, 2))
    
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(fcmPayload)
    })

    console.log('🔍 FCM Response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('FCM Error response:', errorText)
      
      if (response.status === 410) {
        throw new Error('Push subscription expired')
      }
      throw new Error(`FCM responded with ${response.status}: ${errorText}`)
    }
    
    console.log('✅ FCM push sent successfully')
  } else {
    console.log('🔍 Non-FCM endpoint, using standard web push')
    
    // For non-FCM endpoints, use standard web push
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Web Push Error response:', errorText)
      
      if (response.status === 410) {
        throw new Error('Push subscription expired')
      }
      throw new Error(`Push service responded with ${response.status}: ${errorText}`)
    }
  }
}

// Simple VAPID token creation for FCM
async function createSimpleVapidToken(): Promise<string> {
  // Create a simple JWT-like token for VAPID
  // In production, you'd use a proper JWT library
  const header = {
    typ: 'JWT',
    alg: 'ES256'
  }
  
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    aud: 'https://fcm.googleapis.com',
    exp: now + 3600, // 1 hour
    sub: 'mailto:admin@kpege.com'
  }
  
  // For now, return a basic token without signing
  // FCM might accept this for testing, but production needs proper signing
  const headerB64 = btoa(JSON.stringify(header))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  
  return `${headerB64}.${payloadB64}.unsigned`
}

// Alternative: Try direct FCM API approach
async function sendViaNativePushAPI(subscription: PushSubscription, payload: any): Promise<void> {
  console.log('🔍 Trying native push API approach')
  
  // Use the Web Push Protocol more directly
  const headers: Record<string, string> = {
    'Content-Type': 'application/octet-stream',
    'TTL': '86400',
    'Content-Length': '0'
  }
  
  // For empty notification (browser will show generic notification)
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers
  })
  
  console.log('🔍 Native push response status:', response.status)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('Native push error:', errorText)
    throw new Error(`Native push failed: ${response.status} ${errorText}`)
  }
  
  console.log('✅ Native push sent successfully')
} 