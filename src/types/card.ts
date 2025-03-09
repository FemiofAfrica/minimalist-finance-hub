
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
