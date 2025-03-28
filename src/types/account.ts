
export type AccountType = "checking" | "savings" | "credit" | "investment" | string;

export interface Account {
  account_id: string;
  user_id: string;
  name: string; // Changed from account_name to match DB schema
  type: AccountType; // Changed from account_type to match DB schema
  balance: number; // Changed from current_balance to match DB schema
  currency: string; // Added to match DB schema
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  
  // Legacy fields for backward compatibility
  account_name?: string;
  account_type?: string;
  current_balance?: number;
  institution?: string;
  account_number?: string;
  custom_tags?: string[];
}
