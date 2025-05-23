export type CardType = "CREDIT" | "DEBIT" | "PREPAID" | "OTHER" | string;

/**
 * Represents a card in the system with fields that match the database schema.
 */
export interface Card {
  // Primary keys and relations
  card_id: string;
  user_id: string;
  account_id?: string;
  
  // Core database fields
  name: string;         // Card name (e.g., "Personal Visa")
  type: CardType;       // The type of card
  last_four: string;    // Last 4 digits of the card number
  created_at?: string;  // Creation timestamp
  updated_at?: string;  // Last update timestamp

  // Legacy/backward compatibility fields - these exist in application but not in database
  // Used to maintain compatibility with existing components
  card_name?: string;     // Alias for name
  card_type?: CardType;   // Alias for type
  card_number?: string;   // Alias for last_four, but might include formatting
  expiry_date?: string;   // Not in DB schema
  credit_limit?: number;  // Not in DB schema
  current_balance?: number; // Not in DB schema
  is_active?: boolean;    // Not in DB schema
  custom_tags?: string[]; // Not in DB schema
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
    name: card.name,
    type: card.type,
    last_four: card.last_four,
    created_at: card.created_at,
    updated_at: card.updated_at,
    
    // Add legacy fields for backward compatibility
    card_name: card.name,
    card_type: card.type,
    card_number: card.last_four ? `•••• •••• •••• ${card.last_four}` : undefined,
    
    // current_balance should be set from the linked account's balance separately
    current_balance: 0 // Default to 0; should be updated with account balance
  };
}

/**
 * Helper function to prepare card data for database insertion/update
 */
export function prepareDatabaseCard(card: Partial<Card>): any {
  // Extract only the database fields
  const { 
    card_id, user_id, account_id,
    name, type, last_four,
    created_at, updated_at
  } = card;
  
  return {
    card_id,
    user_id,
    account_id,
    name: card.name || card.card_name,
    type: card.type || card.card_type,
    last_four: card.last_four || (card.card_number ? card.card_number.slice(-4) : undefined),
    created_at,
    updated_at: updated_at || new Date().toLocaleDateString('en-CA')
  };
}
