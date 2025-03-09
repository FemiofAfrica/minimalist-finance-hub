
export type AccountType = "SAVINGS" | "CHECKING" | "INVESTMENTS" | "DEBT_SERVICING" | "OTHER";

export interface Account {
  account_id: string;
  user_id?: string;
  account_name: string;
  account_type: AccountType;
  institution?: string;
  account_number?: string;
  current_balance: number;
  is_active: boolean;
  custom_tags?: string[];
  created_at?: string;
  updated_at?: string;
}
