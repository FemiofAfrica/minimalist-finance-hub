// supabase/functions/send-subscription-reminders/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// Import Supabase client library (use Admin client for elevated access)
import { createClient, User } from "https://esm.sh/@supabase/supabase-js@2";

// Define CORS headers (adjust origin as needed for security)
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.kpege.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// --- Interfaces (Optional but helpful for clarity) ---
// Type for data selected from subscriptions table
type SubscriptionSelect = {
  subscription_id: string;
  name: string;
  amount: number;
  next_billing_date: string; // YYYY-MM-DD
  reminder_days: number;
  user_id: string | null; // User ID might be null if there's an issue?
}

interface SubscriptionReminderInfo extends SubscriptionSelect {
  // Additional optional properties if needed
}

interface UserInfo {
  email?: string;
}

interface EmailPreferences {
  subscription_reminders_enabled: boolean;
  notification_emails_enabled: boolean;
  email_frequency: string;
  unsubscribe_token: string;
}

// Email service interface
interface EmailService {
  sendEmail(to: string, templateData: any): Promise<boolean>;
}

// Generate plain text email content
function generatePlainTextEmail(templateData: any): string {
  return `KPEGE
──────

⚠️ SUBSCRIPTION RENEWAL REMINDER ⚠️

Hi there!

We wanted to remind you about an upcoming subscription renewal.

SUBSCRIPTION DETAILS
────────────────────
Service: ${templateData.SubscriptionName}
Amount: $${templateData.Amount}
Renews on: ${templateData.RenewalDate}

Your subscription will automatically renew unless you cancel or modify it before the renewal date.

WHAT HAPPENS NEXT?
Your payment method will be charged automatically on the renewal date. You can cancel, pause, or modify this subscription at any time from your Kpege dashboard.

MANAGE YOUR SUBSCRIPTION
────────────────────────
→ Manage This Subscription: ${templateData.ManageURL}
→ View All Subscriptions: ${templateData.ViewAllURL}
→ Go to Dashboard: ${templateData.DashboardURL}

NEED HELP?
──────────
Questions? Contact our support team at hello@kpege.com

EMAIL PREFERENCES
─────────────────
→ Unsubscribe from subscription reminders: ${templateData.UnsubscribeURL}
→ Update email preferences: ${templateData.PreferencesURL}

────────────────────────────────────────────────────────────────

This email was sent by Kpege to remind you of an upcoming subscription renewal.
You can manage your email preferences or unsubscribe using the links above.

Kpege - Your Personal Finance Hub
https://www.kpege.com`;
}

// Postmark email service implementation
class PostmarkEmailService implements EmailService {
  private apiKey: string;
  private templateAlias: string;

  constructor(apiKey: string, templateAlias: string = 'subscription-reminder') {
    this.apiKey = apiKey;
    this.templateAlias = templateAlias;
  }

  async sendEmail(to: string, templateData: any): Promise<boolean> {
    try {
      // Generate plain text version
      const plainTextContent = generatePlainTextEmail(templateData);
      
      const response = await fetch('https://api.postmarkapp.com/email/withTemplate', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Server-Token': this.apiKey,
        },
        body: JSON.stringify({
          TemplateAlias: this.templateAlias,
          To: to,
          From: 'noreply@kpege.com', // Configure this in your environment
          TemplateModel: templateData,
          // Include plain text version for better deliverability
          TextBody: plainTextContent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Postmark API error: ${response.status} - ${errorText}`);
        return false;
      }

      const result = await response.json();
      console.log(`Email sent successfully to ${to}, MessageID: ${result.MessageID}`);
      return true;
    } catch (error) {
      console.error(`Error sending email to ${to}:`, error);
      return false;
    }
  }
}

// Fallback email service (for development/testing)
class MockEmailService implements EmailService {
  async sendEmail(to: string, templateData: any): Promise<boolean> {
    const plainTextContent = generatePlainTextEmail(templateData);
    console.log(`[MOCK EMAIL] To: ${to}`);
    console.log(`[MOCK EMAIL] HTML Template Data:`, templateData);
    console.log(`[MOCK EMAIL] Plain Text Content:\n${plainTextContent}`);
    return true;
  }
}

// Function to get email service
function getEmailService(): EmailService {
  const postmarkApiKey = Deno.env.get('POSTMARK_API_KEY');
  
  if (!postmarkApiKey) {
    console.warn('No POSTMARK_API_KEY found, using mock email service');
    return new MockEmailService();
  }
  
  return new PostmarkEmailService(postmarkApiKey);
}

serve(async (req: Request) => {
  // --- Handle CORS Preflight ---
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    // --- Environment Variables Validation ---
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    if (!Deno.env.get('SUPABASE_URL') || !Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      throw new Error('Missing required environment variables for Supabase');
    }

    // Initialize email service
    const emailService = getEmailService();

    // --- Setup Date Criteria for Finding Subscriptions ---
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    // --- Fetch Active Subscriptions with Reminders ---
    console.log("Fetching active subscriptions with reminder settings...");
    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('is_active', true)
      .gt('reminder_days', 0); // Only subscriptions with reminders enabled

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No active subscriptions with reminders found.");
      return new Response(JSON.stringify({ message: "No subscriptions to check." }), {
        headers: corsHeaders,
      });
    }

    console.log(`Fetched ${subscriptions.length} active subscriptions with reminders.`);
    const remindersDueToday: SubscriptionReminderInfo[] = [];
    let notificationsCreated = 0;
    let emailsSent = 0;

    // --- Filter Subscriptions Due for Reminder Today ---
    subscriptions.forEach((sub: SubscriptionSelect) => {
      if (!sub.user_id) {
         console.warn(`Subscription ${sub.subscription_id} missing user_id, skipping.`);
         return; 
      }
      try {
        const nextBilling = new Date(sub.next_billing_date + "T00:00:00Z");
        const reminderDays = sub.reminder_days;

        const reminderDate = new Date(nextBilling);
        reminderDate.setDate(nextBilling.getDate() - reminderDays);
        reminderDate.setHours(0, 0, 0, 0);

        if (reminderDate.getTime() === today.getTime()) {
          console.log(`Subscription due for reminder: ${sub.name} (ID: ${sub.subscription_id})`);
          remindersDueToday.push(sub as SubscriptionReminderInfo);
        }
      } catch (dateError) {
        console.error(`Error processing date for subscription ${sub.subscription_id}:`, dateError);
      }
    });

    if (remindersDueToday.length === 0) {
        console.log("No subscriptions due for reminder today.");
        return new Response(JSON.stringify({ message: "No reminders due today." }), {
            headers: corsHeaders,
        });
    }

    console.log(`Processing ${remindersDueToday.length} subscription reminders...`);

    // --- Process Each Subscription Reminder ---
    for (const sub of remindersDueToday) {
      try {
        // Check if notification already exists for this subscription today
        const { data: existingNotification } = await supabaseAdmin
          .from('notifications')
          .select('notification_id')
          .eq('user_id', sub.user_id)
          .eq('related_id', sub.subscription_id)
          .eq('source', 'subscription')
          .gte('created_at', new Date().toISOString().split('T')[0]) // Today's notifications
          .maybeSingle();

        if (existingNotification) {
          console.log(`Notification already exists for subscription ${sub.subscription_id}. Skipping.`);
          continue;
        }

        // Get user information and email preferences
        const { data: userInfo, error: userError } = await supabaseAdmin.auth.admin.getUserById(sub.user_id!);
        if (userError || !userInfo.user?.email) {
          console.error(`Error fetching user info for ${sub.user_id}:`, userError);
          continue;
        }

        // Get user email preferences
        const { data: emailPrefs, error: prefsError } = await supabaseAdmin
          .rpc('get_user_email_preferences', { p_user_id: sub.user_id })
          .single();

        if (prefsError) {
          console.error(`Error fetching email preferences for user ${sub.user_id}:`, prefsError);
          // Continue with default preferences (send email)
        }

        // Format subscription amount and date
        const amountFormatted = sub.amount.toFixed(2);
        const nextBillingFormatted = new Date(sub.next_billing_date + "T00:00:00Z")
          .toLocaleDateString("en-US", { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            timeZone: 'UTC' 
          });

        // Create in-app notification
        const { error: notificationError } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: sub.user_id,
            title: 'Upcoming Subscription Renewal',
            message: `Your subscription "${sub.name}" will renew on ${nextBillingFormatted} for $${amountFormatted}.`,
            type: 'warning',
            source: 'subscription',
            related_id: sub.subscription_id,
            link: '/subscriptions',
            is_read: false,
            is_dismissed: false,
            expires_at: new Date(new Date(sub.next_billing_date).getTime() + 86400000) // Next day after billing
          });

        if (notificationError) {
          console.error(`Error creating notification for subscription ${sub.subscription_id}:`, notificationError);
        } else {
          notificationsCreated++;
          console.log(`Created in-app notification for subscription ${sub.subscription_id}`);
        }

        // Send email if user preferences allow it
        const shouldSendEmail = !emailPrefs || (
          emailPrefs.subscription_reminders_enabled && 
          emailPrefs.notification_emails_enabled &&
          emailPrefs.email_frequency !== 'disabled'
        );

        if (shouldSendEmail) {
          try {
            // Prepare email template data
            const baseUrl = Deno.env.get('SITE_URL') || 'https://www.kpege.com';
            const unsubscribeToken = emailPrefs?.unsubscribe_token || '';
            
            const emailTemplateData = {
              SubscriptionName: sub.name,
              Amount: amountFormatted,
              RenewalDate: nextBillingFormatted,
              ManageURL: `${baseUrl}/subscriptions?id=${sub.subscription_id}`,
              ViewAllURL: `${baseUrl}/subscriptions`,
              DashboardURL: `${baseUrl}/dashboard`,
              UnsubscribeURL: `${baseUrl}/unsubscribe?token=${unsubscribeToken}&type=subscription_reminders`,
              PreferencesURL: `${baseUrl}/settings#email-preferences`,
            };

            const emailSent = await emailService.sendEmail(userInfo.user.email, emailTemplateData);
            if (emailSent) {
              emailsSent++;
              console.log(`Email sent successfully for subscription ${sub.subscription_id}`);
            } else {
              console.error(`Failed to send email for subscription ${sub.subscription_id}`);
            }
          } catch (emailError) {
            console.error(`Error sending email for subscription ${sub.subscription_id}:`, emailError);
          }
        } else {
          console.log(`Email skipped for subscription ${sub.subscription_id} - user preferences disabled`);
        }

      } catch (error) {
        console.error(`Error processing subscription ${sub.subscription_id}:`, error);
      }
    }

    // --- Return Success Response ---
    return new Response(
      JSON.stringify({ 
        message: `Processed ${remindersDueToday.length} subscription reminders`,
        notifications_created: notificationsCreated,
        emails_sent: emailsSent,
        total_processed: remindersDueToday.length
      }), 
      {
        headers: corsHeaders,
      }
    );

  } catch (error) {
    console.error("Error in send-subscription-reminders function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});