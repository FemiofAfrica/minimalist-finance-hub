// Define the category type
export type CategoryType = "income" | "expense" | "transfer";

// Category interface matching the database schema
export interface Category {
  category_id: string;
  user_id: string;
  name: string;
  description?: string | null;
  type: CategoryType;
  color?: string | null;
  icon?: string | null;
  parent_category_id?: string | null;
  created_at?: string;
  updated_at?: string;
}