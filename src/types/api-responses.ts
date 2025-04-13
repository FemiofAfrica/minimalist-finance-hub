// API Response Types for Supabase Functions

// Response from parse-transaction-groq function
export interface ParseTransactionResponse {
  // Success fields
  description: string;
  amount: number;
  category_name: string;
  category_type: "INCOME" | "EXPENSE";
  date: string;
  
  // Error fields (only present on error)
  error?: string;
  details?: string;
}

// Response from transaction creation endpoints
export interface TransactionCreationResponse {
  success: boolean;
  transaction?: import('./transaction').Transaction;
  error?: string;
}