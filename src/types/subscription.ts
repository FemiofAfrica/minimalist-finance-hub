// Define the Subscription types
export type SubscriptionFrequency = "MONTHLY" | "ANNUALLY" | "QUARTERLY" | "WEEKLY" | "CUSTOM";

// Map from DB enum to our internal types
export function mapDBFrequencyToAppFrequency(dbFrequency: string): SubscriptionFrequency {
  // Handle case sensitivity
  const normalizedFreq = dbFrequency.toUpperCase();
  switch (normalizedFreq) {
    case 'MONTHLY':
    case 'ANNUALLY':
    case 'QUARTERLY':
    case 'WEEKLY':
    case 'CUSTOM':
      return normalizedFreq as SubscriptionFrequency;
    case 'YEARLY':
      return 'ANNUALLY';
    default:
      return 'CUSTOM';
  }
}

// Map from our types to DB enum
export function mapAppFrequencyToDBFrequency(appFrequency: SubscriptionFrequency): string {
  console.log("Original frequency to map:", appFrequency, typeof appFrequency);
  
  // Special case for ANNUALLY -> yearly since this is causing the most problems
  if (appFrequency === "ANNUALLY" || String(appFrequency).toUpperCase() === "ANNUALLY") {
    console.log("Mapping ANNUALLY to yearly");
    return "yearly";
  }
  
  // Convert to string and lowercase for consistency
  const frequency = String(appFrequency).toLowerCase();
  console.log("Normalized frequency:", frequency);
  
  // Direct mapping to exact DB enum values
  const mappings: Record<string, string> = {
    'monthly': 'monthly',
    'annually': 'yearly',  // This is critical - DB uses 'yearly' not 'annually'
    'quarterly': 'quarterly',
    'weekly': 'weekly',
    'custom': 'monthly'    // Default custom to monthly
  };
  
  // Get the mapped value or default to monthly
  const result = mappings[frequency] || 'monthly';
  console.log("Final mapped result:", result);
  
  return result;
}

export interface Subscription {
  subscription_id: string;
  name: string;
  description?: string | null;
  amount: number;
  frequency: SubscriptionFrequency;
  next_billing_date: string;
  category_id?: string | null;
  category_name?: string | null;
  category_type?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  user_id?: string | null;
  auto_renew: boolean;
  reminder_days: number; // Days before renewal to send reminder
  provider_id?: string | null; // Reference to the global subscription provider
}

export interface SubscriptionProvider {
  provider_id: string;
  name: string;
  category_id?: string | null;
  category_name?: string | null;
  logo_url?: string | null;
  website?: string | null;
  is_popular: boolean; // Flag for pre-integrated popular services
  created_at?: string;
  created_by_user_id?: string | null; // Track which user added this provider
}