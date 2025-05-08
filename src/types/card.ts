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
 * Note: This function doesn't set the current_balance. The current_balance
 * should be set using the account's balance when fetching cards.
 */
export function normalizeDatabaseCard(card: any): Card {
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
    
    // current_balance should be set from the linked account's balance separately
    current_balance: 0 // Default to 0; should be updated with account balance
  };
}
