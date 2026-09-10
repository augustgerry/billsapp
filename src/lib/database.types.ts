export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bill_months: {
        Row: {
          amount: number | null
          bill_id: string
          installment_advanced: boolean
          month: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          bill_id: string
          installment_advanced?: boolean
          month: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          bill_id?: string
          installment_advanced?: boolean
          month?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_months_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          category: string
          created_at: string
          due_day: number
          due_month: number
          due_year: number
          estimate: number
          group_id: string
          id: string
          installment_total: number | null
          lender: string | null
          name: string
          paid_count: number
          responsible: string
          split_members: string[]
          tenor: number | null
          type: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          due_day: number
          due_month: number
          due_year: number
          estimate: number
          group_id: string
          id?: string
          installment_total?: number | null
          lender?: string | null
          name: string
          paid_count?: number
          responsible: string
          split_members?: string[]
          tenor?: number | null
          type: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          due_day?: number
          due_month?: number
          due_year?: number
          estimate?: number
          group_id?: string
          id?: string
          installment_total?: number | null
          lender?: string | null
          name?: string
          paid_count?: number
          responsible?: string
          split_members?: string[]
          tenor?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          created_at: string
          email: string
          group_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          group_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          group_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          code: string
          created_at: string
          created_by: string
          id: string
          name: string
          pin: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          pin: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          pin?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number | null
          bill_id: string
          is_receipt: boolean | null
          member: string
          month: string
          ocr_matched: boolean | null
          platform: string | null
          proof_path: string | null
          status: string
          suspicious_note: string | null
          updated_at: string
          uploaded_at: string | null
        }
        Insert: {
          amount?: number | null
          bill_id: string
          is_receipt?: boolean | null
          member: string
          month: string
          ocr_matched?: boolean | null
          platform?: string | null
          proof_path?: string | null
          status?: string
          suspicious_note?: string | null
          updated_at?: string
          uploaded_at?: string | null
        }
        Update: {
          amount?: number | null
          bill_id?: string
          is_receipt?: boolean | null
          member?: string
          month?: string
          ocr_matched?: boolean | null
          platform?: string | null
          proof_path?: string | null
          status?: string
          suspicious_note?: string | null
          updated_at?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          wa: string
        }
        Insert: {
          created_at?: string
          id: string
          wa: string
        }
        Update: {
          created_at?: string
          id?: string
          wa?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          platform: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          platform?: string | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          platform?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recent_groups: {
        Row: {
          group_id: string
          hidden: boolean
          opened_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          hidden?: boolean
          opened_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          hidden?: boolean
          opened_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recent_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bill_group: { Args: { bid: string }; Returns: string }
      create_group: {
        Args: { p_members: Json; p_name: string; p_pin: string }
        Returns: {
          code: string
          created_at: string
          created_by: string
          id: string
          name: string
          pin: string
        }
        SetofOptions: {
          from: "*"
          to: "groups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_email: { Args: never; Returns: string }
      current_member_name: { Args: { gid: string }; Returns: string }
      duplicate_group: {
        Args: { p_group_id: string }
        Returns: {
          code: string
          created_at: string
          created_by: string
          id: string
          name: string
          pin: string
        }
        SetofOptions: {
          from: "*"
          to: "groups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      gen_group_code: { Args: never; Returns: string }
      get_group_for_join: {
        Args: { p_code: string }
        Returns: {
          group_id: string
          member_name: string
          name: string
        }[]
      }
      is_group_member: { Args: { gid: string }; Returns: boolean }
      push_tokens_for_group_member: {
        Args: { p_group_id: string; p_member: string }
        Returns: {
          token: string
        }[]
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

// ---------------------------------------------------------------------------
// App-side aliases (hand-added; keep after regenerating this file)
// ---------------------------------------------------------------------------

export type BillRow = Database['public']['Tables']['bills']['Row'];
export type BillMonthRow = Database['public']['Tables']['bill_months']['Row'];
export type GroupRow = Database['public']['Tables']['groups']['Row'];
export type GroupMemberRow = Database['public']['Tables']['group_members']['Row'];
export type PaymentRow = Database['public']['Tables']['payments']['Row'];
export type RecentGroupRow = Database['public']['Tables']['recent_groups']['Row'];
export type JoinLookupRow =
  Database['public']['Functions']['get_group_for_join']['Returns'][number];
