
// Define the Transaction types
export type TransactionType = "EXPENSE" | "INCOME";

export type TransactionFlowType = 
  "REGULAR" | 
  "INTER_ACCOUNT_TRANSFER" | 
  "CARD_TO_CASH" | 
  "CARD_TO_EXTERNAL" | 
  "CASH_TO_EXTERNAL" | 
  "ACCOUNT_TO_EXTERNAL";

export interface Transaction {
  transaction_id: string;
  description: string;
  amount: number;
  category_type: string;
  category_id?: string | null;
  category_name?: string | null;
  date: string;
  created_at?: string;
  updated_at?: string;
  notes?: string | null;
  source?: string | null;
  user_id?: string | null;
  account_id?: string | null;
  card_id?: string | null;
  transaction_type?: TransactionFlowType | null;
}
