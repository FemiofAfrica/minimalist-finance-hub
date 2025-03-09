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
          account_name: string
          account_number: string | null
          account_type: string
          created_at: string | null
          current_balance: number | null
          custom_tags: string[] | null
          institution: string | null
          is_active: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string
          account_name: string
          account_number?: string | null
          account_type: string
          created_at?: string | null
          current_balance?: number | null
          custom_tags?: string[] | null
          institution?: string | null
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string
          account_name?: string
          account_number?: string | null
          account_type?: string
          created_at?: string | null
          current_balance?: number | null
          custom_tags?: string[] | null
          institution?: string | null
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      budgets: {
        Row: {
          budget_id: string
          budget_limit: number
          category_id: string | null
          created_at: string
          period: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          budget_id?: string
          budget_limit: number
          category_id?: string | null
          created_at?: string
          period: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          budget_id?: string
          budget_limit?: number
          category_id?: string | null
          created_at?: string
          period?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cards: {
        Row: {
          account_id: string | null
          card_id: string
          card_name: string
          card_number: string | null
          card_type: string
          created_at: string | null
          credit_limit: number | null
          current_balance: number | null
          custom_tags: string[] | null
          expiry_date: string | null
          is_active: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          card_id?: string
          card_name: string
          card_number?: string | null
          card_type: string
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          custom_tags?: string[] | null
          expiry_date?: string | null
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          card_id?: string
          card_name?: string
          card_number?: string | null
          card_type?: string
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          custom_tags?: string[] | null
          expiry_date?: string | null
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["account_id"]
          },
        ]
      }
      categories: {
        Row: {
          category_id: string
          category_name: string
          category_type: string
          color: string | null
          icon: string | null
          user_id: string | null
        }
        Insert: {
          category_id?: string
          category_name: string
          category_type: string
          color?: string | null
          icon?: string | null
          user_id?: string | null
        }
        Update: {
          category_id?: string
          category_name?: string
          category_type?: string
          color?: string | null
          icon?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          document_id: string
          file_name: string
          file_path: string
          processed_status: string
          uploaded_at: string
          user_id: string | null
        }
        Insert: {
          document_id?: string
          file_name: string
          file_path: string
          processed_status: string
          uploaded_at?: string
          user_id?: string | null
        }
        Update: {
          document_id?: string
          file_name?: string
          file_path?: string
          processed_status?: string
          uploaded_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      emails: {
        Row: {
          body: string
          email_id: string
          parsed_data: Json
          processed_at: string
          received_at: string
          subject: string
          user_id: string | null
        }
        Insert: {
          body: string
          email_id?: string
          parsed_data: Json
          processed_at?: string
          received_at: string
          subject: string
          user_id?: string | null
        }
        Update: {
          body?: string
          email_id?: string
          parsed_data?: Json
          processed_at?: string
          received_at?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          message: string
          notification_id: string
          read_status: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          message: string
          notification_id?: string
          read_status?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          message?: string
          notification_id?: string
          read_status?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      preferences: {
        Row: {
          key: string
          preference_id: string
          user_id: string | null
          value: string
        }
        Insert: {
          key: string
          preference_id?: string
          user_id?: string | null
          value: string
        }
        Update: {
          key?: string
          preference_id?: string
          user_id?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
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
          account_id: string | null
          amount: number
          card_id: string | null
          category_id: string | null
          category_name: string | null
          category_type: string | null
          created_at: string
          date: string
          description: string
          source: string | null
          transaction_id: string
          transaction_type: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          card_id?: string | null
          category_id?: string | null
          category_name?: string | null
          category_type?: string | null
          created_at?: string
          date: string
          description: string
          source?: string | null
          transaction_id?: string
          transaction_type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          card_id?: string | null
          category_id?: string | null
          category_name?: string | null
          category_type?: string | null
          created_at?: string
          date?: string
          description?: string
          source?: string | null
          transaction_id?: string
          transaction_type?: string | null
          updated_at?: string
          user_id?: string | null
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
            foreignKeyName: "transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "transactions_category_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          name: string
          password_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          name: string
          password_hash: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          email?: string
          name?: string
          password_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_transactions_with_categories: {
        Args: Record<PropertyKey, never>
        Returns: {
          transaction_id: string
          user_id: string
          amount: number
          date: string
          description: string
          notes: string
          source: string
          category_name: string
          category_type: string
        }[]
      }
      insert_transaction: {
        Args: {
          p_user_id: string
          p_amount: number
          p_date: string
          p_description: string
          p_category_name: string
          p_category_type: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
