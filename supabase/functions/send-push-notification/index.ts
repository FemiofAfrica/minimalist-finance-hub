import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
}

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

interface NotificationResult {
  success: boolean
  pushResults?: Array<{ success: boolean; endpoint: string; error?: string }>
  emailResults?: Array<{ success: boolean; email: string; error?: string }>
  totalTargeted: number
  totalSent: number
  errors: string[]
}

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')

serve(async (req) => {
  console.log('🚀 Edge Function Starting - send-push-notification')
  console.log('🔍 Request method:', req.method)
  
  if (req.method === 'OPTIONS') {
    console.log('🔍 Handling OPTIONS preflight request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Processing POST request...')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const adminApiKey = Deno.env.get('ADMIN_API_KEY') || 'temp-admin-key-for-debugging'
    
    console.log('🔍 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
      hasBrevoApiKey: !!BREVO_API_KEY,
      hasBrevoTemplateId: !!Deno.env.get('BREVO_TRANSACTIONAL_TEMPLATE_ID'),
      hasVapidPublic: !!VAPID_PUBLIC_KEY,
      hasVapidPrivate: !!VAPID_PRIVATE_KEY,
      adminApiKey: adminApiKey
    })
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.log('❌ Missing required environment variables')
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create supabase client with service role key for admin operations
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey)
    console.log('✅ Supabase client created with service role')
    
    // Check for admin API key first (for development/testing)
    const adminKey = req.headers.get('x-admin-key') || req.headers.get('X-Admin-Key')
    const debugInfo = {
      hasAdminKey: !!adminKey,
      adminKeyValue: adminKey,
      expectedKey: 'temp-admin-key-for-debugging',
      adminKeyMatch: adminKey === 'temp-admin-key-for-debugging',
      headerKeys: Array.from(req.headers.keys())
    }
    
    console.log('🔑 Admin API key check:', debugInfo)
    
    if (adminKey === 'temp-admin-key-for-debugging') {
      console.log('🔑 Admin API key detected - bypassing JWT check')
      
      // Get request body
      const requestBody: PushNotificationRequest = await req.json()
      console.log('🔍 Request body received via admin key:', {
        hasTitle: !!requestBody.title,
        hasMessage: !!requestBody.message,
        targetType: requestBody.targetType,
        userId: requestBody.userId,
        shouldTriggerEmail: requestBody.shouldTriggerEmail
      })
      
      // Validate required fields
      if (!requestBody.title || !requestBody.message) {
        console.log('❌ Missing required fields')
        return new Response(JSON.stringify({ 
          error: 'Missing required fields: title, message',
          debug: { adminKeyBypass: true, debugInfo }
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // Process the notification directly
      try {
        const result = await processNotification(supabaseClient, requestBody)
        console.log('📊 Final result (admin bypass):', result)
        
        return new Response(JSON.stringify({
          success: result.success,
          message: result.success ? 'Notifications processed successfully!' : 'Some notifications failed',
          details: { ...result, debug: { adminKeyBypass: true, debugInfo } },
          timestamp: new Date().toISOString()
        }), {
          status: result.success ? 200 : 207, // 207 for partial success
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Error in admin bypass processing',
          details: { 
            error: error instanceof Error ? error.message : 'Unknown error',
            debug: { adminKeyBypass: true, debugInfo, error: error instanceof Error ? error.stack : 'No stack' }
          },
          timestamp: new Date().toISOString()
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }
    
    console.log('🔐 No admin key detected, proceeding with JWT authentication')
    
    // Get the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Missing or invalid Authorization header')
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('🔍 Extracted token length:', token.length)
    console.log('🔍 Token sample (first 50 chars):', token.substring(0, 50) + '...')
    
    // Validate the JWT token using getUser()
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      console.log('❌ JWT validation failed:', {
        error: userError,
        hasUser: !!user,
        tokenLength: token.length
      })
      return new Response(JSON.stringify({ 
        error: 'Invalid or expired token',
        details: userError?.message || 'No user found'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    console.log('✅ JWT validated successfully for user:', user.email)
    console.log('🔍 User object from JWT:', JSON.stringify(user, null, 2))
    
    // Fetch complete user data from database using service role to get ALL metadata
    const { data: dbUser, error: dbUserError } = await supabaseClient
      .from('auth.users')
      .select('id, email, raw_user_meta_data, raw_app_meta_data')
      .eq('id', user.id)
      .single()
    
    if (dbUserError || !dbUser) {
      console.log('❌ Failed to fetch user from database:', dbUserError)
      return new Response(JSON.stringify({ 
        error: 'Failed to verify user permissions',
        details: dbUserError?.message || 'User not found in database'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    console.log('✅ User data fetched from database:', JSON.stringify(dbUser, null, 2))
    
    // Check if user is super admin using database data (not JWT data)
    const isSuperAdmin = dbUser.raw_user_meta_data?.is_super_admin === true || 
                        dbUser.raw_app_meta_data?.is_super_admin === true ||
                        user.user_metadata?.is_super_admin === true || 
                        user.app_metadata?.is_super_admin === true
    
    console.log('🔍 Super admin check (using database data):', {
      dbRawUserMetadata: dbUser.raw_user_meta_data?.is_super_admin,
      dbRawAppMetadata: dbUser.raw_app_meta_data?.is_super_admin,
      jwtUserMetadata: user.user_metadata?.is_super_admin,
      jwtAppMetadata: user.app_metadata?.is_super_admin,
      isSuperAdmin,
      fullDbUserMetadata: dbUser.raw_user_meta_data,
      fullDbAppMetadata: dbUser.raw_app_meta_data
    })
    
    if (!isSuperAdmin) {
      console.log('❌ User is not a super admin:', user.email)
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    console.log('✅ User authenticated as super admin:', user.email)
    
    // Get request body
    const requestBody: PushNotificationRequest = await req.json()
    console.log('🔍 Request body received:', {
      hasTitle: !!requestBody.title,
      hasMessage: !!requestBody.message,
      targetType: requestBody.targetType,
      shouldTriggerEmail: requestBody.shouldTriggerEmail
    })
    
    // Validate required fields
    if (!requestBody.title || !requestBody.message) {
      console.log('❌ Missing required fields')
      return new Response(JSON.stringify({ error: 'Missing required fields: title, message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Process the notification
    const result = await processNotification(supabaseClient, requestBody)
    console.log('📊 Final result:', result)
    
    return new Response(JSON.stringify({
      success: result.success,
      message: result.success ? 'Notifications processed successfully!' : 'Some notifications failed',
      details: result,
      timestamp: new Date().toISOString()
    }), {
      status: result.success ? 200 : 207, // 207 for partial success
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Unexpected error in edge function:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function processNotification(supabaseClient: any, request: PushNotificationRequest): Promise<NotificationResult> {
  const result: NotificationResult = {
    success: true,
    pushResults: [],
    emailResults: [],
    totalTargeted: 0,
    totalSent: 0,
    errors: []
  }

  try {
    // Get target users based on request type
    let targetUsers
    try {
      targetUsers = await getTargetUsers(supabaseClient, request)
      console.log(`🎯 Found ${targetUsers.length} target users:`, targetUsers)
    } catch (error) {
      console.error(`❌ Error getting target users:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestType: request.targetType,
        userId: request.userId,
        errorStack: error instanceof Error ? error.stack : 'No stack'
      })
      result.errors.push(`Failed to get target users: ${error instanceof Error ? error.message : 'Unknown error'}`)
      result.success = false
      return result
    }
    
    result.totalTargeted = targetUsers.length
    
    if (targetUsers.length === 0) {
      result.errors.push('No target users found')
      result.success = false
      return result
    }

    // Send push notifications if VAPID keys are available
    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      console.log('📱 Sending push notifications...')
      const pushResults = await sendPushNotifications(supabaseClient, targetUsers, request)
      result.pushResults = pushResults
      
      // Count successful push notifications
      const successfulPushes = pushResults.filter(r => r.success).length
      result.totalSent += successfulPushes
      
      // Add push errors to the main errors array
      const pushErrors = pushResults.filter(r => !r.success).map(r => r.error).filter(Boolean)
      if (pushErrors.length > 0) {
        result.errors.push(...pushErrors)
        console.log(`⚠️ Push notification errors: ${pushErrors.length}/${pushResults.length} failed`)
      }
      
      console.log(`📱 Push notifications: ${successfulPushes}/${pushResults.length} successful`)
    } else {
      console.log('⚠️ VAPID keys not configured, skipping push notifications')
      result.errors.push('VAPID keys not configured for push notifications')
    }

    // Send email notifications if requested and Brevo API key is available
    if (request.shouldTriggerEmail && BREVO_API_KEY) {
      console.log('📧 Sending email notifications...')
      const emailResults = await sendEmailNotifications(targetUsers, request)
      result.emailResults = emailResults
      
      // Count successful email notifications
      const successfulEmails = emailResults.filter(r => r.success).length
      result.totalSent += successfulEmails
      
      // Add email errors to the main errors array
      const emailErrors = emailResults.filter(r => !r.success).map(r => r.error).filter(Boolean)
      if (emailErrors.length > 0) {
        result.errors.push(...emailErrors)
        console.log(`⚠️ Email notification errors: ${emailErrors.length}/${emailResults.length} failed`)
      }
      
      console.log(`📧 Email notifications: ${successfulEmails}/${emailResults.length} successful`)
    } else if (request.shouldTriggerEmail) {
      console.log('⚠️ Brevo API key not configured, skipping email notifications')
      result.errors.push('Email notifications requested but Brevo API key not configured')
    }

    // Determine overall success - success only if no errors occurred
    result.success = result.errors.length === 0 && result.totalSent > 0
    
    if (!result.success) {
      console.log(`❌ Notification processing completed with errors: ${result.errors.length} errors, ${result.totalSent}/${result.totalTargeted} sent`)
    } else {
      console.log(`✅ Notification processing completed successfully: ${result.totalSent}/${result.totalTargeted} sent`)
    }

    // Log notification to database
    await logNotification(supabaseClient, request, result, targetUsers)

  } catch (error) {
    console.error('❌ Error processing notification:', error)
    result.success = false
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
  }

  return result
}

async function getTargetUsers(supabaseClient: any, request: PushNotificationRequest): Promise<Array<{id: string, email: string | undefined }>> {
  if (request.targetType === 'single') {
    if (!request.userId) {
      throw new Error('userId is required for single target type')
    }
    
    console.log(`🎯 Fetching single user with ID: ${request.userId}`)
    
    try {
      // First verify user exists in auth.users
      const { data: authUser, error: authError } = await supabaseClient.auth.admin.getUserById(request.userId)
      
      console.log(`🔍 auth.users lookup result:`, {
        hasAuthUser: !!authUser,
        hasAuthError: !!authError,
        authErrorMessage: authError?.message,
        authUserId: authUser?.id,
        authUserExists: !!authUser
      })
      
      if (authError || !authUser) {
        console.error(`User not found in auth.users ${request.userId}:`, authError)
        throw new Error(`User not found in authentication system: ${authError?.message || 'User not found'}`)
      }
      
      // Now fetch user profile from public.profiles table
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('id', request.userId)
        .single()
      
      console.log(`🔍 profiles table lookup result:`, {
        hasProfile: !!profile,
        hasProfileError: !!profileError,
        profileErrorMessage: profileError?.message,
        profileData: profile ? {
          id: profile.id,
          email: profile.email,
          hasId: !!profile.id,
          hasEmail: !!profile.email,
          keysInProfile: Object.keys(profile)
        } : null
      })
      
      if (profileError || !profile) {
        console.error(`Profile not found in public.profiles for user ${request.userId}:`, profileError)
        throw new Error(`User profile not found: ${profileError?.message || 'Profile not found'}`)
      }
      
      console.log(`✅ Found user profile:`, {
        id: profile.id,
        email: profile.email,
        hasId: !!profile.id,
        hasEmail: !!profile.email
      })
      
      // Validate the user has both ID and email
      if (!profile.id) {
        throw new Error(`User ID is undefined for user with email: ${profile.email}`)
      }
      
      if (!profile.email) {
        throw new Error(`User ${profile.id} has no email in profile.`)
      }
      
      return [{ id: profile.id, email: profile.email }]
    } catch (error) {
      console.error(`❌ Error in single user lookup:`, {
        userId: request.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : 'No stack'
      })
      throw error
    }
  }

  if (request.targetType === 'segment') {
    if (!request.segment) {
      throw new Error('segment is required for segment target type')
    }
    
    return await getSegmentUsers(supabaseClient, request.segment, request.duration, request.durationUnit)
  }

  throw new Error('Invalid target type')
}

async function getSegmentUsers(
  supabaseClient: any,
  segment: string,
  duration?: number,
  durationUnit?: string
): Promise<Array<{ id: string; email: string | undefined }>> {
  
  console.log(`📊 Fetching users for segment: ${segment}`)
  
  if (segment === 'all_users') {
    // Fetch all profiles with emails
    const { data: profiles, error } = await supabaseClient
      .from('profiles')
      .select('id, email')
      .not('email', 'is', null)
    
    if (error) {
      throw new Error(`Failed to fetch all users from profiles: ${error.message}`)
    }
    
    console.log(`Found ${profiles?.length || 0} users with profiles and emails`)
    return profiles || []
  }

  if (segment === 'super_admins') {
    console.log('Fetching super admins...')
    
    // First get all auth users with super admin flag
    const allAuthUsers: Array<any> = []
    let page = 1
    const perPage = 1000

    while (true) {
      const { data: { users: userBatch }, error } = await supabaseClient.auth.admin.listUsers({ page, perPage })

      if (error) {
        throw new Error(`Failed to fetch auth users (page ${page}): ${error.message}`)
      }

      if (userBatch && userBatch.length > 0) {
        console.log(`Page ${page}: Found ${userBatch.length} auth users`)
        allAuthUsers.push(...userBatch)
      }

      if (!userBatch || userBatch.length < perPage) {
        break
      }
      page += 1
    }

    console.log(`Total auth users fetched: ${allAuthUsers.length}`)

    // Filter for super admins
    const superAdminIds = allAuthUsers
      .filter(user => {
        const isSuperAdmin = user.user_metadata?.is_super_admin === true || 
                            user.raw_user_meta_data?.is_super_admin === true
        if (isSuperAdmin) {
          console.log(`Found super admin in auth: ${user.id}`)
        }
        return isSuperAdmin
      })
      .map(user => user.id)

    console.log(`Found ${superAdminIds.length} super admin IDs from auth`)

    if (superAdminIds.length === 0) {
      console.log('No super admins found in auth metadata')
      return []
    }

    // Now get profiles for these super admin user IDs
    const { data: superAdminProfiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, email')
      .in('id', superAdminIds)
      .not('email', 'is', null)

    if (profileError) {
      throw new Error(`Failed to fetch super admin profiles: ${profileError.message}`)
    }

    console.log(`Found ${superAdminProfiles?.length || 0} super admin profiles with emails`)
    return superAdminProfiles || []
  }

  if (segment === 'time_based') {
    if (!duration || !durationUnit) {
      throw new Error('duration and durationUnit are required for time_based segment')
    }

    const thresholdDate = new Date()
    if (durationUnit === 'hours') thresholdDate.setHours(thresholdDate.getHours() - duration)
    if (durationUnit === 'days') thresholdDate.setDate(thresholdDate.getDate() - duration)
    if (durationUnit === 'weeks') thresholdDate.setDate(thresholdDate.getDate() - duration * 7)
    if (durationUnit === 'months') thresholdDate.setMonth(thresholdDate.getMonth() - duration)

    console.log(`Filtering for users active since ${thresholdDate.toISOString()}`)
    
    // Get recently active auth users
    const allAuthUsers: Array<any> = []
    let page = 1
    const perPage = 1000

    while (true) {
      const { data: { users: userBatch }, error } = await supabaseClient.auth.admin.listUsers({ page, perPage })

      if (error) {
        throw new Error(`Failed to fetch auth users (page ${page}): ${error.message}`)
      }

      if (userBatch && userBatch.length > 0) {
        allAuthUsers.push(...userBatch)
      }

      if (!userBatch || userBatch.length < perPage) {
        break
      }
      page += 1
    }

    // Filter for recently active users
    const activeUserIds = allAuthUsers
      .filter(user => user.last_sign_in_at && new Date(user.last_sign_in_at) > thresholdDate)
      .map(user => user.id)

    console.log(`Found ${activeUserIds.length} recently active users`)

    if (activeUserIds.length === 0) {
      return []
    }

    // Get profiles for these active users
    const { data: activeProfiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, email')
      .in('id', activeUserIds)
      .not('email', 'is', null)

    if (profileError) {
      throw new Error(`Failed to fetch active user profiles: ${profileError.message}`)
    }

    console.log(`Found ${activeProfiles?.length || 0} active user profiles with emails`)
    return activeProfiles || []
  }

  throw new Error(`Invalid segment: ${segment}`)
}

async function sendEmailNotifications(
  targetUsers: Array<{id: string, email: string | undefined}>, 
  request: PushNotificationRequest
): Promise<Array<{ success: boolean; email: string; error?: string }>> {
  
  const templateId = Deno.env.get('BREVO_TRANSACTIONAL_TEMPLATE_ID')
  if (!templateId) {
    console.error('❌ BREVO_TRANSACTIONAL_TEMPLATE_ID is not set. Skipping email notifications.')
    return targetUsers.map(u => ({
      success: false,
      email: u.email || 'unknown',
      error: 'Email template not configured on server.',
    }))
  }

  console.log('📧 Processing email notifications for target users:', targetUsers.map(u => ({ id: u.id, email: u.email, hasEmail: !!u.email })))

  const emailPromises = targetUsers.map(async (user) => {
    console.log(`Processing user: id=${user.id}, email=${user.email}, hasEmail=${!!user.email}`)
    
    if (!user.email) {
      console.log(`User ${user.id} has no email, skipping.`)
      return { success: false, email: 'unknown', error: `User ${user.id} has no email.` }
    }
    
    try {
      console.log(`Sending transactional email to: ${user.email}`)
      const { data: { user: fullUser }, error: userError } = await createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!).auth.admin.getUserById(user.id)
      
      if(userError || !fullUser) {
        console.error(`Failed to get full user details for ${user.id}:`, userError)
        return { success: false, email: user.email, error: 'Failed to fetch full user details.' }
      }

      const firstName = fullUser.user_metadata?.first_name || fullUser.email?.split('@')[0] || 'there'

      // Ensure URL is absolute for email links
      const absoluteUrl = makeAbsoluteUrl(request.url || '/dashboard')

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: [{
            email: user.email,
            name: firstName
          }],
          templateId: parseInt(templateId, 10),
          params: {
            FIRST_NAME: firstName,
            TITLE: request.title,
            MESSAGE: request.message,
            URL: absoluteUrl,
          },
          sender: {
            name: 'Barida from Kpeege',
            email: 'hello@kpege.com'
          },
        })
      })

      if (!res.ok) {
        const errorBody = await res.json()
        throw new Error(`Brevo API Error: ${res.status} ${JSON.stringify(errorBody)}`)
      }

      console.log(`Transactional email sent successfully to ${user.email}`)
      return { success: true, email: user.email }
      
    } catch (e: any) {
      console.error(`Error sending email to: ${user.email}`, e)
      return { success: false, email: user.email, error: e.message }
    }
  })
  
  return Promise.all(emailPromises)
}

async function logNotification(
  supabaseClient: any, 
  request: PushNotificationRequest, 
  result: NotificationResult,
  targetUsers: Array<{id: string, email: string | undefined}>
): Promise<void> {
  try {
    console.log('📝 Logging notification for target users:', targetUsers.length)
    
    // Create individual notification records for each target user
    const notificationRecords = targetUsers.map(user => ({
      user_id: user.id,
      title: request.title,
      message: request.message,
      url: request.url,
      notification_type: 'push', // Use correct database column
      status: 'sent', // Use correct database column
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }))
    
    console.log('🔍 Creating notification records for users:', notificationRecords.map(n => ({ user_id: n.user_id, title: n.title })))
    
    // Insert individual notifications for each user
    const { error: notificationError } = await supabaseClient
      .from('notifications')
      .insert(notificationRecords)

    if (notificationError) {
      console.error('❌ Failed to create user notifications:', notificationError)
    } else {
      console.log(`✅ Created ${notificationRecords.length} individual user notifications`)
    }
    
    // Also create a system log entry for admin tracking
    const systemLogEntry = {
      title: `[SYSTEM] ${request.title}`,
      message: `Notification sent to ${result.totalTargeted} users. ${result.totalSent} successful.`,
      url: null,
      notification_type: 'push',
      status: 'sent',
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      metadata: {
        targetType: request.targetType,
        segment: request.segment,
        totalTargeted: result.totalTargeted,
        totalSent: result.totalSent,
        pushResults: result.pushResults?.length || 0,
        emailResults: result.emailResults?.length || 0,
        errors: result.errors
      }
    }
    
    // Insert system log (this can be user_id null for system notifications)
    const { error: systemError } = await supabaseClient
      .from('notifications')
      .insert(systemLogEntry)

    if (systemError) {
      console.error('❌ Failed to create system log entry:', systemError)
    } else {
      console.log('✅ System log entry created')
    }

  } catch (error) {
    console.error('❌ Error logging notification:', error)
  }
}

async function sendPushNotifications(
  supabaseClient: any,
  targetUsers: Array<{id: string, email: string | undefined}>,
  request: PushNotificationRequest
): Promise<Array<{ success: boolean; endpoint: string; error?: string }>> {
  const results: Array<{ success: boolean; endpoint: string; error?: string }> = []

  console.log('🔍 Starting push notifications for users:', targetUsers.map(u => ({ id: u.id, email: u.email, hasId: !!u.id })))

  for (const user of targetUsers) {
    try {
      // Validate user data before proceeding
      if (!user.id) {
        console.error('❌ User ID is undefined/null for user:', user)
        results.push({ 
          success: false, 
          endpoint: 'unknown', 
          error: `User ID is undefined for user with email: ${user.email}` 
        })
        continue
      }

      console.log(`🔍 Fetching push subscriptions for user: ${user.id} (${user.email})`)

      // Get push subscriptions for this user
      const { data: subscriptions, error } = await supabaseClient
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (error) {
        console.error('❌ Failed to fetch push subscriptions for user:', user.id, error)
        results.push({ 
          success: false, 
          endpoint: 'unknown', 
          error: `Database error for user ${user.id}: ${error.message}` 
        })
        continue
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log(`ℹ️ No push subscriptions found for user: ${user.email} (${user.id})`)
        // Don't add to results array for users with no subscriptions - this is normal
        continue
      }

      console.log(`📱 Found ${subscriptions.length} push subscriptions for user: ${user.email}`)

      // Send to each subscription
      for (const subscription of subscriptions) {
        try {
          await sendWebPush(subscription, {
            title: request.title,
            body: request.message,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            data: {
              url: request.url || '/',
              timestamp: Date.now()
            }
          })
          
          results.push({ success: true, endpoint: subscription.endpoint })
          console.log('✅ Push notification sent to:', subscription.endpoint.substring(0, 50) + '...')

        } catch (error) {
          console.error('❌ Failed to send push notification to endpoint:', subscription.endpoint.substring(0, 50) + '...', error)
          results.push({ 
            success: false, 
            endpoint: subscription.endpoint, 
            error: error instanceof Error ? error.message : 'Unknown push error'
          })
        }
      }

    } catch (error) {
      console.error('❌ Error processing push notifications for user:', user.id, error)
      results.push({ 
        success: false, 
        endpoint: 'unknown', 
        error: `Processing error for user ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    }
  }

  console.log(`📊 Push notification results: ${results.filter(r => r.success).length}/${results.length} successful`)
  return results
}

async function sendWebPush(subscription: any, payload: any): Promise<void> {
  console.log('🔍 Sending push to endpoint:', subscription.endpoint.substring(0, 50) + '...')
  
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('VAPID keys not configured')
  }

  // For FCM (Firebase Cloud Messaging), use proper VAPID signing
  if (subscription.endpoint.includes('fcm.googleapis.com')) {
    console.log('🔍 Detected FCM endpoint - using VAPID authentication')
    
    // Create the VAPID headers
    const vapidHeaders = await createVapidHeaders(subscription.endpoint)
    
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
        ...vapidHeaders
      },
      body: JSON.stringify({
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/icon-192x192.png',
          badge: payload.badge || '/icon-192x192.png',
          data: payload.data || {}
        }
      })
    })

    console.log('🔍 FCM push response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('FCM push error:', errorText)
      
      if (response.status === 410) {
        throw new Error('FCM push subscription expired')
      }
      throw new Error(`FCM responded with ${response.status}: ${errorText}`)
    }
    
    console.log('✅ FCM push sent successfully')
    
  } else {
    console.log('🔍 Non-FCM endpoint, using standard web push')
    
    // For non-FCM endpoints, use standard approach
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400'
      },
      body: JSON.stringify(payload)
    })

    console.log('🔍 Standard push response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Standard push error:', errorText)
      
      if (response.status === 410) {
        throw new Error('Push subscription expired')
      }
      throw new Error(`Push service responded with ${response.status}: ${errorText}`)
    }
    
    console.log('✅ Standard push sent successfully')
  }
}

async function createVapidHeaders(endpoint: string): Promise<Record<string, string>> {
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`
  
  // Create JWT header
  const header = {
    typ: 'JWT',
    alg: 'ES256'
  }
  
  // Create JWT payload  
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    sub: `mailto:hello@kpege.com`
  }
  
  // Base64URL encode header and payload
  const encodedHeader = base64URLEncode(JSON.stringify(header))
  const encodedPayload = base64URLEncode(JSON.stringify(payload))
  
  // Create the data to sign
  const data = `${encodedHeader}.${encodedPayload}`
  
  // Import the VAPID private key
  const privateKey = await importVapidPrivateKey(VAPID_PRIVATE_KEY!)
  
  // Sign the data
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(data)
  )
  
  // Base64URL encode the signature
  const encodedSignature = base64URLEncode(new Uint8Array(signature))
  
  // Create the JWT
  const jwt = `${data}.${encodedSignature}`
  
  // For FCM, only use Authorization header with vapid scheme
  if (endpoint.includes('fcm.googleapis.com')) {
    return {
      'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`
    }
  } else {
    // For other push services, use both headers for compatibility
    return {
      'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      'Crypto-Key': `p256ecdsa=${VAPID_PUBLIC_KEY}`
    }
  }
}

async function importVapidPrivateKey(privateKeyString: string): Promise<CryptoKey> {
  try {
    console.log('🔍 Attempting to import VAPID private key')
    console.log('Key format:', {
      length: privateKeyString.length,
      isPEM: privateKeyString.includes('-----BEGIN'),
      sample: privateKeyString.substring(0, 20) + '...'
    })
    
    // First, try to import as PKCS#8 (PEM format)
    if (privateKeyString.includes('-----BEGIN PRIVATE KEY-----')) {
      console.log('🔍 Detected PEM format VAPID private key')
      const cleanKey = privateKeyString
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\s/g, '')
      
      const binaryKey = Uint8Array.from(atob(cleanKey), c => c.charCodeAt(0))
      
      return await crypto.subtle.importKey(
        'pkcs8',
        binaryKey,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      )
    }
    
    // Handle web-push CLI format (raw base64url-encoded private key)
    console.log('🔍 Attempting to import web-push CLI format private key')
    
    // Convert base64url to base64
    let base64Key = privateKeyString
      .replace(/-/g, '+')
      .replace(/_/g, '/')
    
    // Add padding if needed
    while (base64Key.length % 4) {
      base64Key += '='
    }
    
    const binaryKey = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0))
    
    console.log('🔍 Binary key info:', {
      originalLength: privateKeyString.length,
      binaryLength: binaryKey.length,
      firstBytes: Array.from(binaryKey.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')
    })
    
    // For 32-byte raw keys (web-push CLI format), construct proper PKCS#8
    if (binaryKey.length === 32) {
      console.log('🔍 Detected 32-byte raw private key, constructing PKCS#8 format')
      
      // PKCS#8 structure for EC P-256 private key
      // This is the standard ASN.1 DER encoding for an EC private key
      const pkcs8Header = new Uint8Array([
        0x30, 0x81, 0x87,                          // SEQUENCE (135 bytes)
        0x02, 0x01, 0x00,                          // INTEGER version (0)
        0x30, 0x13,                                // SEQUENCE AlgorithmIdentifier
        0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID ecPublicKey
        0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, // OID prime256v1 (P-256)
        0x04, 0x6d,                                // OCTET STRING (109 bytes)
        0x30, 0x6b,                                // SEQUENCE (107 bytes)
        0x02, 0x01, 0x01,                          // INTEGER version (1)
        0x04, 0x20                                 // OCTET STRING (32 bytes) - private key follows
      ])
      
      // The private key bytes go here (32 bytes)
      // Then we need the public key part, but for our use case, we can create a minimal structure
      const pkcs8Suffix = new Uint8Array([
        0xa1, 0x44,                                // [1] EXPLICIT (68 bytes)
        0x03, 0x42, 0x00                           // BIT STRING (66 bytes, 0 unused bits)
        // Public key would go here, but we'll try without it first
      ])
      
      // Create a simplified PKCS#8 structure with just the private key
      const simplePkcs8 = new Uint8Array([
        0x30, 0x81, 0x93,                          // SEQUENCE (147 bytes)
        0x02, 0x01, 0x00,                          // INTEGER version (0)
        0x30, 0x13,                                // SEQUENCE AlgorithmIdentifier  
        0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID ecPublicKey
        0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, // OID prime256v1
        0x04, 0x79,                                // OCTET STRING (121 bytes)
        0x30, 0x77,                                // SEQUENCE (119 bytes)
        0x02, 0x01, 0x01,                          // INTEGER version (1)
        0x04, 0x20,                                // OCTET STRING (32 bytes)
        ...binaryKey,                              // The 32-byte private key
        0xa1, 0x50,                                // [1] EXPLICIT (80 bytes)
        0x03, 0x4e, 0x00,                          // BIT STRING (78 bytes, 0 unused bits)
        // Add minimal public key structure (zeros for now - this might work)
        ...new Array(75).fill(0)
      ])
      
      try {
        console.log('🔍 Trying custom PKCS#8 structure')
        return await crypto.subtle.importKey(
          'pkcs8',
          simplePkcs8,
          { name: 'ECDSA', namedCurve: 'P-256' },
          false,
          ['sign']
        )
      } catch (customPkcs8Error) {
        console.log('Custom PKCS#8 failed, trying raw import with correct algorithm...', customPkcs8Error)
        
        // Alternative approach: Try importing as raw key with different parameters
        try {
          // Try importing the raw 32 bytes directly as a private key
          // This might work with some JavaScript crypto implementations
          console.log('🔍 Trying raw key import with ECDSA algorithm')
          return await crypto.subtle.importKey(
            'raw',
            binaryKey,
            { name: 'ECDSA', namedCurve: 'P-256' },
            false,
            ['sign']
          )
        } catch (rawError) {
          console.log('Raw import failed, trying to construct minimal working JWK...', rawError)
          
          // Last resort: Create a minimal JWK that might work
          // We'll provide dummy x,y coordinates - this is not cryptographically correct
          // but might be enough for the WebCrypto API to accept it
          const minimalJwk = {
            kty: 'EC',
            crv: 'P-256',
            d: privateKeyString,
            x: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // Dummy x coordinate
            y: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'  // Dummy y coordinate
          }
          
          try {
            console.log('🔍 Trying minimal JWK with dummy coordinates')
            return await crypto.subtle.importKey(
              'jwk',
              minimalJwk,
              { name: 'ECDSA', namedCurve: 'P-256' },
              false,
              ['sign']
            )
          } catch (minimalJwkError) {
            console.error('All import attempts failed for 32-byte key')
            throw new Error(`Unable to import 32-byte private key. Tried PKCS#8, raw, and JWK formats. Last error: ${minimalJwkError instanceof Error ? minimalJwkError.message : 'Unknown error'}`)
          }
        }
      }
    } else {
      // Try as PKCS#8 format for other lengths
      console.log('🔍 Trying PKCS#8 format for non-32-byte key')
      try {
        return await crypto.subtle.importKey(
          'pkcs8',
          binaryKey,
          { name: 'ECDSA', namedCurve: 'P-256' },
          false,
          ['sign']
        )
      } catch (pkcs8Error) {
        console.log('PKCS#8 import failed, trying JWK format...', pkcs8Error)
        
        // Try to create a JWK format - but this will likely fail without x,y coordinates
        const jwk = {
          kty: 'EC',
          crv: 'P-256',
          d: privateKeyString
        }
        
        try {
          return await crypto.subtle.importKey(
            'jwk',
            jwk,
            { name: 'ECDSA', namedCurve: 'P-256' },
            false,
            ['sign']
          )
        } catch (jwkError) {
          console.log('JWK import failed...', jwkError)
          throw new Error(`Unable to import private key: ${pkcs8Error instanceof Error ? pkcs8Error.message : 'Unknown PKCS#8 error'}`)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to import VAPID private key:', error)
    console.error('Key format:', {
      length: privateKeyString.length,
      isPEM: privateKeyString.includes('-----BEGIN'),
      sample: privateKeyString.substring(0, 50) + '...'
    })
    throw new Error(`Failed to import VAPID private key: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function base64URLEncode(data: string | Uint8Array): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const base64 = btoa(String.fromCharCode(...bytes))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function makeAbsoluteUrl(relativeUrl: string): string {
  // If already absolute, return as-is
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    console.log(`🔗 URL already absolute: ${relativeUrl}`)
    return relativeUrl
  }
  
  // Get base URL from environment variable or use default
  // Set APP_BASE_URL in Supabase secrets to your actual domain
  const baseUrl = Deno.env.get('APP_BASE_URL') || 'https://www.kpege.com'
  
  // Ensure relative URL starts with /
  const path = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`
  
  const absoluteUrl = `${baseUrl}${path}`
  console.log(`🔗 Converting relative URL "${relativeUrl}" to absolute: ${absoluteUrl}`)
  
  return absoluteUrl
} 