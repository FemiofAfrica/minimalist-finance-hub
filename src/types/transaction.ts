
// Define the Transaction types
export type TransactionType = "EXPENSE" | "INCOME";

export interface Transaction {
  transaction_id: string;
  description: string;
  amount: number;
  category_type: string;
  category_id?: string | null;
  category_name?: string | null;  // Added for joining with categories table
  date: string;
  created_at?: string;
  updated_at?: string;
  notes?: string | null;
  source?: string | null;
  user_id?: string | null;
}
