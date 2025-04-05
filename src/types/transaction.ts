// Define the base transaction types
export type TransactionType = "income" | "expense" | "transfer";

// Base transaction properties
export interface TransactionBase {
  transaction_id: string;
  user_id: string;
  amount: number;
  currency: string;
  date: string;
  created_at?: string;
  updated_at?: string;
  description?: string | null;
  notes?: string | null;
  name?: string | null;
}

// Account-related properties
export interface TransactionAccountInfo {
  account_id: string;
  account_name?: string;
}

// Card-related properties
export interface TransactionCardInfo {
  card_id?: string | null;
  card_name?: string;
}

// Category-related properties
export interface TransactionCategoryInfo {
  category_id?: string | null;
  category_name?: string | null;
  category_type?: "INCOME" | "EXPENSE" | "TRANSFER" | null;
}

// Legacy flow types for backward compatibility
export type TransactionFlowTypeBase = 
  "REGULAR" | 
  "INTER_ACCOUNT_TRANSFER" | 
  "CARD_TO_CASH" | 
  "CARD_TO_EXTERNAL" | 
  "CASH_TO_EXTERNAL" | 
  "ACCOUNT_TO_EXTERNAL";

// Use this type for compatibility with database responses
export type TransactionFlowType = TransactionFlowTypeBase | (string & {});

// Legacy properties
export interface TransactionLegacyInfo {
  source?: string | null;
  transaction_type?: TransactionFlowType | null;
}

// Define a simplified transaction type for database operations
export interface TransactionInput {
  user_id: string;
  amount: number;
  currency: string;
  date: string;
  type: TransactionType;
  description?: string;
  notes?: string;
  account_id?: string;
  category_id?: string;
  category_name?: string;
  name?: string;
}

// Base Transaction interface - aligns closer to DB + needed UI fields
export interface Transaction {
  transaction_id: string;
  user_id?: string | null; // Made optional as it might not always be needed client-side
  account_id: string; 
  category_id?: string | null;
  description: string | null; // Use description as the primary field
  amount: number;
  currency: string;
  date: string;
  type: 'income' | 'expense' | 'transfer'; // Use the enum type
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  // Fields derived from joins or needed for UI
  account_name?: string | null; 
  category_name?: string | null;
  category_type?: "INCOME" | "EXPENSE" | "TRANSFER"; // Keep category_type if used
}
