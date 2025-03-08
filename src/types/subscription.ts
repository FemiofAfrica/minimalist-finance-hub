// Define the Subscription types
export type SubscriptionFrequency = "MONTHLY" | "QUARTERLY" | "ANNUALLY" | "CUSTOM";

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