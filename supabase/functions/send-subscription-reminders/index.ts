// supabase/functions/send-subscription-reminders/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Import Supabase client library (use Admin client for elevated access)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// REMOVED: Resend import

// Define CORS headers (adjust origin as needed for security)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// --- Interfaces (Optional but helpful for clarity) ---
interface SubscriptionReminderInfo {
  subscription_id: string;
  name: string;
  amount: number;
  next_billing_date: string; // YYYY-MM-DD
  reminder_days: number;
  user_id: string;
}

interface UserInfo {
  email?: string;
}

// --- Main Function Logic ---
serve(async (req: Request) => {
  // --- Handle CORS Preflight ---
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Authorization ---
    const authHeader = req.headers.get("Authorization");
    const functionSecret = Deno.env.get("SUPABASE_FUNCTION_SECRET");
    if (!functionSecret || authHeader !== `Bearer ${functionSecret}`) {
      console.warn("Unauthorized attempt to trigger reminder function.");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    console.log("Starting subscription reminder check...");

    // --- Initialize Supabase Admin Client ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase URL or Service Role Key environment variables.");
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // --- Brevo API Key ---
    const brevoApiKey = Deno.env.get("BREVO_API_KEY"); // Store in Function secrets
    if (!brevoApiKey) {
      throw new Error("Missing BREVO_API_KEY environment variable.");
    }
    const brevoApiUrl = "https://api.brevo.com/v3/smtp/email";
    const fromEmail = Deno.env.get("EMAIL_FROM_ADDRESS") || "noreply@yourdomain.com"; // Set your sending address
    const fromName = Deno.env.get("EMAIL_FROM_NAME") || "SayFin"; // Optional: Set your sender name

    // --- Get Today's Date ---
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    // --- Fetch ALL Active Subscriptions ---
    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from("subscriptions")
      .select("subscription_id, name, amount, next_billing_date, reminder_days, user_id")
      .eq("is_active", true)
      .gt("reminder_days", 0);

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
    const emailsToSend: Promise<any>[] = [];
    const usersToFetch = new Set<string>();
    const remindersDueToday: SubscriptionReminderInfo[] = [];

    // --- Filter Subscriptions Due for Reminder Today ---
    subscriptions.forEach((sub) => {
      try {
        const nextBilling = new Date(sub.next_billing_date + "T00:00:00Z");
        const reminderDays = sub.reminder_days;

        const reminderDate = new Date(nextBilling);
        reminderDate.setDate(nextBilling.getDate() - reminderDays);
        reminderDate.setHours(0, 0, 0, 0);

        if (reminderDate.getTime() === today.getTime()) {
          console.log(`Subscription due for reminder: ${sub.name} (ID: ${sub.subscription_id})`);
          remindersDueToday.push(sub as SubscriptionReminderInfo);
          if (sub.user_id) {
            usersToFetch.add(sub.user_id);
          }
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

    // --- Fetch User Emails in Batch ---
    const userEmailMap = new Map<string, string>();
    if (usersToFetch.size > 0) {
       const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
       if (usersError) {
         console.error("Error fetching users:", usersError);
       } else {
         usersData?.users.forEach(user => {
            if (usersToFetch.has(user.id) && user.email) {
              userEmailMap.set(user.id, user.email);
            }
         });
       }
     }

    console.log(`Attempting to send ${remindersDueToday.length} reminders via Brevo.`);

    // --- Prepare and Send Emails using Brevo API ---
    remindersDueToday.forEach((sub) => {
      const userEmail = userEmailMap.get(sub.user_id);

      if (!userEmail) {
        console.warn(`Could not find email for user ${sub.user_id} for subscription ${sub.subscription_id}. Skipping.`);
        return;
      }

      // Customize email content
      const subject = `Upcoming Subscription Payment: ${sub.name}`;
      const amountFormatted = sub.amount.toFixed(2); // Format amount as needed
      const nextBillingFormatted = new Date(sub.next_billing_date + "T00:00:00Z").toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

      const body = `
        <p>Hi there,</p>
        <p>This is a reminder that your subscription for <strong>${sub.name}</strong> is due soon!</p>
        <p><strong>Amount:</strong> ${amountFormatted}</p>
        <p><strong>Next Payment Date:</strong> ${nextBillingFormatted}</p>
        <p>Manage your subscriptions in the SayFin app.</p>
        <br/>
        <p>Thanks,</p>
        <p>The SayFin Team</p>
      `;

      // Brevo API payload
      const payload = {
        sender: { email: fromEmail, name: fromName },
        to: [{ email: userEmail }], // Brevo expects an array for 'to'
        subject: subject,
        htmlContent: body,
      };

      // Add email sending promise to the array
      emailsToSend.push(
        fetch(brevoApiUrl, {
          method: "POST",
          headers: {
            "accept": "application/json",
            "api-key": brevoApiKey,
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        })
        .then(async (response) => {
          // Check if response is ok (status 2xx)
          if (!response.ok) {
            // Try to parse error details from Brevo
            let errorData = { status: response.status, statusText: response.statusText };
            try {
              const responseBody = await response.json();
              errorData = { ...errorData, ...responseBody };
            } catch (parseError) {
              // Ignore if response body isn't valid JSON
            }
            throw errorData; // Throw an object containing error info
          }
          return response.json(); // Return Brevo's success response (e.g., { messageId: '...' })
        })
        .catch(emailError => ({ // Catch fetch errors or thrown errors
            subscription_id: sub.subscription_id,
            user_id: sub.user_id,
            error: emailError instanceof Error ? emailError.message : emailError // Store error message or object
        }))
      );
    });

    // --- Wait for all emails to be sent ---
    const results = await Promise.allSettled(emailsToSend);
    let successCount = 0;
    let failureCount = 0;

    results.forEach((result, index) => {
        const subInfo = remindersDueToday[index];
        // Check if fulfilled AND if the resolved value doesn't contain our 'error' property
        if (result.status === 'fulfilled' && !result.value?.error) {
            console.log(`Successfully sent reminder via Brevo for subscription ${subInfo.subscription_id} to user ${subInfo.user_id}. Response:`, result.value);
            successCount++;
        } else {
            failureCount++;
            const errorReason = result.status === 'rejected' ? result.reason : result.value?.error;
            console.error(`Failed to send reminder via Brevo for subscription ${subInfo.subscription_id} to user ${subInfo.user_id}:`, errorReason);
        }
    });

    console.log(`Brevo reminder process finished. Success: ${successCount}, Failures: ${failureCount}`);

    // --- Return Success Response ---
    return new Response(JSON.stringify({ message: `Processed reminders via Brevo. Success: ${successCount}, Failures: ${failureCount}` }), {
      headers: corsHeaders,
    });

  } catch (error) {
    console.error("Error in send-subscription-reminders function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});