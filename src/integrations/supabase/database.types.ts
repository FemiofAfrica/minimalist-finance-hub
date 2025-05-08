export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          account_id: string
          account_number: string | null
          balance: number | null
          created_at: string | null
          currency: string
          is_active: boolean | null
          is_default: boolean
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string
          account_number?: string | null
          balance?: number | null
          created_at?: string | null
          currency?: string
          is_active?: boolean | null
          is_default?: boolean
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          account_number?: string | null
          balance?: number | null
          created_at?: string | null
          currency?: string
          is_active?: boolean | null
          is_default?: boolean
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          category_id: string
          category_name: string
          category_type: string
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          parent_category_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id?: string
          category_name: string
          category_type?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          parent_category_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string
          category_name?: string
          category_type?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          parent_category_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_providers: {
        Row: {
          category_id: string | null
          category_name: string | null
          created_at: string
          created_by_user_id: string | null
          is_popular: boolean
          logo_url: string | null
          name: string
          provider_id: string
          website: string | null
        }
        Insert: {
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          created_by_user_id?: string | null
          is_popular?: boolean
          logo_url?: string | null
          name: string
          provider_id?: string
          website?: string | null
        }
        Update: {
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          created_by_user_id?: string | null
          is_popular?: boolean
          logo_url?: string | null
          name?: string
          provider_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_providers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          auto_renew: boolean
          category_id: string | null
          category_name: string | null
          category_type: string | null
          created_at: string
          description: string | null
          frequency: string
          is_active: boolean
          name: string
          next_billing_date: string
          provider_id: string | null
          reminder_days: number
          subscription_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          auto_renew?: boolean
          category_id?: string | null
          category_name?: string | null
          category_type?: string | null
          created_at?: string
          description?: string | null
          frequency: string
          is_active?: boolean
          name: string
          next_billing_date: string
          provider_id?: string | null
          reminder_days?: number
          subscription_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          auto_renew?: boolean
          category_id?: string | null
          category_name?: string | null
          category_type?: string | null
          created_at?: string
          description?: string | null
          frequency?: string
          is_active?: boolean
          name?: string
          next_billing_date?: string
          provider_id?: string | null
          reminder_days?: number
          subscription_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "subscriptions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "subscription_providers"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          category_name: string | null
          category_type: string | null
          created_at: string | null
          currency: string
          date: string
          description: string | null
          notes: string | null
          transaction_id: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          category_name?: string | null
          category_type?: string | null
          created_at?: string | null
          currency: string
          date: string
          description?: string | null
          notes?: string | null
          transaction_id?: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          category_name?: string | null
          category_type?: string | null
          created_at?: string | null
          currency?: string
          date?: string
          description?: string | null
          notes?: string | null
          transaction_id?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
    }
    Views: {
      transaction_details: {
        Row: {
          account_id: string | null
          amount: number | null
          category_id: string | null
          category_name: string | null
          category_type: string | null
          created_at: string | null
          currency: string | null
          date: string | null
          description: string | null
          notes: string | null
          transaction_id: string | null
          type: Database["public"]["Enums"]["transaction_type"] | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_type: "checking" | "savings" | "credit" | "investment"
      subscription_frequency: "monthly" | "yearly" | "quarterly" | "weekly"
      transaction_type: "income" | "expense" | "transfer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
