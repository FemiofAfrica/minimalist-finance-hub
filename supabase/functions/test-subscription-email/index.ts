import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

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

// Email service for testing
class PostmarkEmailService {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
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
          TemplateAlias: 'subscription-reminder',
          To: to,
          From: 'noreply@kpege.com',
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
      console.log(`Test email sent successfully to ${to}, MessageID: ${result.MessageID}`);
      return true;
    } catch (error) {
      console.error(`Error sending test email to ${to}:`, error);
      return false;
    }
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get request parameters
    const { email, subscriptionName, amount, renewalDate } = await req.json();
    
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const postmarkApiKey = Deno.env.get('POSTMARK_API_KEY');
    if (!postmarkApiKey) {
      return new Response(JSON.stringify({ 
        message: 'Test completed - no POSTMARK_API_KEY configured (mock mode)',
        template_data: {
          SubscriptionName: subscriptionName || 'Netflix Premium',
          Amount: amount || '15.99',
          RenewalDate: renewalDate || 'December 15, 2024',
          ManageURL: 'https://www.kpege.com/subscriptions?id=test',
          ViewAllURL: 'https://www.kpege.com/subscriptions',
          DashboardURL: 'https://www.kpege.com/dashboard',
          UnsubscribeURL: 'https://www.kpege.com/unsubscribe?token=test&type=subscription_reminders',
          PreferencesURL: 'https://www.kpege.com/settings#email-preferences',
        }
      }), {
        headers: corsHeaders,
      });
    }

    const emailService = new PostmarkEmailService(postmarkApiKey);
    const baseUrl = Deno.env.get('SITE_URL') || 'https://www.kpege.com';
    
    const emailTemplateData = {
      SubscriptionName: subscriptionName || 'Netflix Premium',
      Amount: amount || '15.99',
      RenewalDate: renewalDate || 'December 15, 2024',
      ManageURL: `${baseUrl}/subscriptions?id=test`,
      ViewAllURL: `${baseUrl}/subscriptions`,
      DashboardURL: `${baseUrl}/dashboard`,
      UnsubscribeURL: `${baseUrl}/unsubscribe?token=test&type=subscription_reminders`,
      PreferencesURL: `${baseUrl}/settings#email-preferences`,
    };

    const emailSent = await emailService.sendEmail(email, emailTemplateData);
    
    if (emailSent) {
      return new Response(JSON.stringify({ 
        message: 'Test email sent successfully',
        template_data: emailTemplateData
      }), {
        headers: corsHeaders,
      });
    } else {
      return new Response(JSON.stringify({ error: 'Failed to send test email' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

  } catch (error) {
    console.error('Error in test function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}); 