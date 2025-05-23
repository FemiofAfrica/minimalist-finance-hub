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
  console.log("mapAppFrequencyToDBFrequency - Original app frequency:", appFrequency);
  
  // Normalize input to uppercase to match SubscriptionFrequency type values consistently
  const upperAppFrequency = String(appFrequency).toUpperCase();

  let dbFrequency: string;

  switch (upperAppFrequency) {
    case 'MONTHLY':
      dbFrequency = 'MONTHLY'; // DB expects uppercase
      break;
    case 'ANNUALLY':
      dbFrequency = 'yearly';  // DB uses 'yearly' (lowercase) for this specific case
      break;
    case 'QUARTERLY':
      dbFrequency = 'QUARTERLY'; // DB expects uppercase
      break;
    case 'WEEKLY':
      dbFrequency = 'WEEKLY';    // DB expects uppercase
      break;
    case 'CUSTOM':
      // Assuming CUSTOM app frequency should map to a default like MONTHLY for the DB
      console.log("Mapping 'CUSTOM' app frequency to 'MONTHLY' for DB.");
      dbFrequency = 'MONTHLY'; 
      break;
    default:
      // This case handles if appFrequency is not one of the known SubscriptionFrequency types.
      // It could also be a defensive measure if a raw DB value was somehow passed in.
      const potentialDirectDBValue = String(appFrequency);
      if (['MONTHLY', 'yearly', 'QUARTERLY', 'WEEKLY'].includes(potentialDirectDBValue)) {
          console.warn(`mapAppFrequencyToDBFrequency - App frequency '${appFrequency}' appears to be a direct DB value. Passing it through.`);
          dbFrequency = potentialDirectDBValue;
      } else {
          console.warn(`mapAppFrequencyToDBFrequency - Unexpected app frequency: '${appFrequency}'. Defaulting to 'MONTHLY' for DB as a fallback.`);
          dbFrequency = 'MONTHLY'; // Fallback to a common default
      }
  }
  console.log(`mapAppFrequencyToDBFrequency - Mapped DB frequency: ${dbFrequency}`);
  return dbFrequency;
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