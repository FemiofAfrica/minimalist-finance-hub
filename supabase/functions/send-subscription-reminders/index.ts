// supabase/functions/send-subscription-reminders/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// Import Supabase client library (use Admin client for elevated access)
import { createClient, User } from "https://esm.sh/@supabase/supabase-js@2";

// Define CORS headers (adjust origin as needed for security)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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

    console.log(`Creating ${remindersDueToday.length} notifications in the database...`);

    // --- Create Notifications in the Database ---
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

        // Format subscription amount and date
        const amountFormatted = sub.amount.toFixed(2);
        const nextBillingFormatted = new Date(sub.next_billing_date + "T00:00:00Z")
          .toLocaleDateString("en-US", { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            timeZone: 'UTC' 
          });

        // Create notification in the database
        const { error: notificationError } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: sub.user_id,
            title: 'Upcoming Subscription Renewal',
            message: `Your subscription "${sub.name}" will renew on ${nextBillingFormatted} for ${amountFormatted}.`,
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
          console.log(`Created notification for subscription ${sub.subscription_id}`);
        }
      } catch (error) {
        console.error(`Error processing notification for subscription ${sub.subscription_id}:`, error);
      }
    }

    // --- Return Success Response ---
    return new Response(
      JSON.stringify({ 
        message: `Created ${notificationsCreated} of ${remindersDueToday.length} subscription renewal notifications` 
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