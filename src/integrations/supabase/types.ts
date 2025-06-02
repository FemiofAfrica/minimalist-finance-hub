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
          bank_name: string | null
          created_at: string | null
          currency: string
          custom_tags: string[] | null
          institution: string | null
          is_active: boolean | null
          is_default: boolean | null
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string
          account_number?: string | null
          balance?: number | null
          bank_name?: string | null
          created_at?: string | null
          currency?: string
          custom_tags?: string[] | null
          institution?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          account_number?: string | null
          balance?: number | null
          bank_name?: string | null
          created_at?: string | null
          currency?: string
          custom_tags?: string[] | null
          institution?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          account_id: string | null
          card_id: string
          created_at: string | null
          last_four: string
          name: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          card_id?: string
          created_at?: string | null
          last_four: string
          name: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          card_id?: string
          created_at?: string | null
          last_four?: string
          name?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          category_id: string
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          name: string
          parent_category_id: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          name: string
          parent_category_id?: string | null
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          name?: string
          parent_category_id?: string | null
          type?: string
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
      exchange_rates: {
        Row: {
          from_currency: string
          id: string
          last_updated: string | null
          rate: number
          to_currency: string
        }
        Insert: {
          from_currency: string
          id?: string
          last_updated?: string | null
          rate: number
          to_currency: string
        }
        Update: {
          from_currency?: string
          id?: string
          last_updated?: string | null
          rate?: number
          to_currency?: string
        }
        Relationships: []
      }
      monthly_snapshots: {
        Row: {
          snapshot_id: string
          user_id: string
          year: number
          month: number
          opening_balance: number
          closing_balance: number
          total_income: number
          total_expenses: number
          transaction_count: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          snapshot_id?: string
          user_id: string
          year: number
          month: number
          opening_balance?: number
          closing_balance?: number
          total_income?: number
          total_expenses?: number
          transaction_count?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          snapshot_id?: string
          user_id?: string
          year?: number
          month?: number
          opening_balance?: number
          closing_balance?: number
          total_income?: number
          total_expenses?: number
          transaction_count?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          expires_at: string | null
          is_dismissed: boolean | null
          is_read: boolean | null
          link: string | null
          message: string
          notification_id: string
          related_id: string | null
          source: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          is_dismissed?: boolean | null
          is_read?: boolean | null
          link?: string | null
          message: string
          notification_id?: string
          related_id?: string | null
          source: string
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          is_dismissed?: boolean | null
          is_read?: boolean | null
          link?: string | null
          message?: string
          notification_id?: string
          related_id?: string | null
          source?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
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
        Relationships: []
      }
      subscriptions: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string | null
          currency: string
          description: string | null
          frequency: Database["public"]["Enums"]["subscription_frequency"]
          is_active: boolean | null
          last_processed_at: string | null
          next_billing_date: string
          notes: string | null
          provider_id: string | null
          provider_name: string | null
          subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string | null
          currency: string
          description?: string | null
          frequency: Database["public"]["Enums"]["subscription_frequency"]
          is_active?: boolean | null
          last_processed_at?: string | null
          next_billing_date: string
          notes?: string | null
          provider_id?: string | null
          provider_name?: string | null
          subscription_id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["subscription_frequency"]
          is_active?: boolean | null
          last_processed_at?: string | null
          next_billing_date?: string
          notes?: string | null
          provider_id?: string | null
          provider_name?: string | null
          subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          linked_transaction_id: string | null
          notes: string | null
          subscription_id: string | null
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
          linked_transaction_id?: string | null
          notes?: string | null
          subscription_id?: string | null
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
          linked_transaction_id?: string | null
          notes?: string | null
          subscription_id?: string | null
          transaction_id?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_transactions_subscription"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["subscription_id"]
          },
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
      user_subscriptions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          metadata: Json | null
          payment_method: string | null
          payment_reference: string | null
          plan_code: string
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          payment_reference?: string | null
          plan_code: string
          started_at: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          payment_reference?: string | null
          plan_code?: string
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      begin_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      check_subscription_renewals: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      commit_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_transaction: {
        Args: { transaction_data: Json }
        Returns: Json
      }
      create_transfer: {
        Args: {
          source_account_id: string
          destination_account_id: string
          amount: number
          date_str: string
          description?: string
          notes?: string
        }
        Returns: Json
      }
      delete_transaction: {
        Args: { transaction_id_param: string }
        Returns: Json
      }
      delete_transfer_transactions: {
        Args: {
          source_transaction_id: string
          destination_transaction_id: string
        }
        Returns: Json
      }
      handle_category: {
        Args: {
          v_category_name: string
          v_category_id: string
          v_user_id: string
          v_category_type: string
        }
        Returns: undefined
      }
      mark_all_notifications_read: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      mark_notification_read: {
        Args: { p_notification_id: string; p_is_read?: boolean }
        Returns: boolean
      }
      rollback_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      send_notification_to_all_users: {
        Args: {
          p_title: string
          p_message: string
          p_type?: string
          p_link?: string
          p_source?: string
          p_related_id?: string
          p_expires_at?: string
        }
        Returns: number
      }
      send_notification_to_user: {
        Args: {
          p_user_id: string
          p_title: string
          p_message: string
          p_type?: string
          p_link?: string
          p_source?: string
          p_related_id?: string
          p_expires_at?: string
        }
        Returns: string
      }
      transfer_funds: {
        Args: {
          p_source_account_id: string
          p_destination_account_id: string
          p_amount: number
          p_date: string
          p_description?: string
          p_notes?: string
        }
        Returns: Json
      }
      update_user_profile: {
        Args: {
          user_id: string
          first_name_param: string
          last_name_param: string
        }
        Returns: undefined
      }
      calculate_monthly_snapshot: {
        Args: {
          p_user_id: string
          p_year: number
          p_month: number
        }
        Returns: undefined
      }
    }
    Enums: {
      account_type: "checking" | "savings" | "credit" | "investment"
      subscription_frequency: "monthly" | "yearly" | "quarterly" | "weekly"
      subscription_status: "active" | "cancelled" | "expired" | "pending"
      transaction_type: "income" | "expense" | "transfer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["checking", "savings", "credit", "investment"],
      subscription_frequency: ["monthly", "yearly", "quarterly", "weekly"],
      subscription_status: [
        "active",
        "inactive",
        "trial",
        "expired",
        "cancelled",
      ],
      transaction_type: ["income", "expense", "transfer"],
    },
  },
} as const
