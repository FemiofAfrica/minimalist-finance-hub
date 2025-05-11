export type AccountType = "checking" | "savings" | "credit" | "investment";

/**
 * Represents a user's financial account.
 * Properties generally align with the 'accounts' table schema in the database.
 */
export interface Account {
  // Core fields mapping directly to the database schema
  account_id: string; // Primary Key (UUID)
  user_id?: string; // Foreign Key (UUID) - Optional here, but required in DB operations
  name: string; // Account name (e.g., "Primary Checking") - DB: text
  type: AccountType; // Account type - DB: account_type (USER-DEFINED)
  balance: number; // Current balance - DB: numeric
  currency?: string; // Currency code (e.g., "NGN", "USD") - DB: text
  is_active: boolean; // Whether the account is active - DB: boolean
  is_default: boolean; // Whether this is the default account for transactions - DB: boolean
  created_at?: string; // Timestamp of creation - DB: timestamptz
  updated_at?: string; // Timestamp of last update - DB: timestamptz

  // Optional fields - These might be application-level details
  institution?: string; // Institution ID or code (if applicable)
  bank_name?: string;    // Human-readable bank name for display
  account_number?: string; // Account number (masked or full, consider security)
  custom_tags?: string[]; // Any custom tags user might apply
}
