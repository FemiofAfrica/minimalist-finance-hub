export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      transactions: {
        Row: {
          transaction_id: string
          user_id: string
          account_id: string
          amount: number
          currency: string
          date: string
          created_at?: string | null
          updated_at?: string | null
          description?: string | null
          type: "income" | "expense" | "transfer"
          category_id?: string | null
          notes?: string | null
          name?: string | null
        }
        Insert: {
          transaction_id?: string
          user_id: string
          account_id: string
          amount: number
          currency: string
          date: string
          created_at?: string | null
          updated_at?: string | null
          description?: string | null
          type: "income" | "expense" | "transfer"
          category_id?: string | null
          notes?: string | null
          name?: string | null
        }
        Update: {
          transaction_id?: string
          user_id?: string
          account_id?: string
          amount?: number
          currency?: string
          date?: string
          created_at?: string | null
          updated_at?: string | null
          description?: string | null
          type?: "income" | "expense" | "transfer"
          category_id?: string | null
          notes?: string | null
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            referencedRelation: "accounts"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      accounts: {
        Row: {
          account_id: string
          user_id: string
          name: string
          type: string
          currency: string
          balance: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string
          user_id: string
          name: string
          type: string
          currency: string
          balance?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          user_id?: string
          name?: string
          type?: string
          currency?: string
          balance?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      categories: {
        Row: {
          category_id: string
          user_id: string
          name: string
          type: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string
          user_id: string
          name: string
          type: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          user_id?: string
          name?: string
          type?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}