export type CardType = "CREDIT" | "DEBIT" | "PREPAID" | "OTHER" | string;

export interface Card {
  card_id: string;
  user_id?: string;
  account_id?: string;
  card_name: string;
  card_type: CardType;
  card_number?: string;
  expiry_date?: string;
  credit_limit?: number;
  current_balance: number;
  is_active: boolean;
  custom_tags?: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Helper function to convert between API and database schemas
 * 
 * @param card The card data from the database
 * @param initialBalance Optional initial balance to set (defaults to 0)
 * @returns A normalized Card object with both DB and legacy fields
 * 
 * Note: The current_balance should be synced with the linked account's balance
 * after normalization using the syncCardWithAccountBalance function.
 */
export function normalizeDatabaseCard(card: any, initialBalance: number = 0): Card {
  // Convert from database fields to application fields
  return {
    card_id: card.card_id,
    user_id: card.user_id,
    account_id: card.account_id,
    card_name: card.name,
    card_type: card.type,
    expiry_date: card.expiry_date,
    credit_limit: card.credit_limit,
    is_active: card.is_active,
    custom_tags: card.custom_tags,
    created_at: card.created_at,
    updated_at: card.updated_at,
    
    // Add legacy fields for backward compatibility
    card_number: card.last_four ? `•••• •••• •••• ${card.last_four}` : undefined,
    
    // Allow setting an initial balance (should be updated with account balance)
    current_balance: initialBalance
  };
}
