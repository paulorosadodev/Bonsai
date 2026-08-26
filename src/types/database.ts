export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
    __InternalSupabase: {
        PostgrestVersion: "14.17";
    };
    public: {
        Tables: {
            recurring_series: {
                Row: {
                    created_at: string;
                    ends_before: string | null;
                    id: string;
                    starts_on: string;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    created_at?: string;
                    ends_before?: string | null;
                    id?: string;
                    starts_on: string;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    created_at?: string;
                    ends_before?: string | null;
                    id?: string;
                    starts_on?: string;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [];
            };
            recurring_versions: {
                Row: {
                    amount_cents: number;
                    category: Database["public"]["Enums"]["category"];
                    created_at: string;
                    description: string | null;
                    effective_from: string;
                    general_tags: Database["public"]["Enums"]["general_tag"][];
                    id: string;
                    installment_count: number;
                    monthly_day: number;
                    name: string;
                    payment_method: Database["public"]["Enums"]["payment_method"];
                    series_id: string;
                    specific_tag: Database["public"]["Enums"]["specific_tag"] | null;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    amount_cents: number;
                    category: Database["public"]["Enums"]["category"];
                    created_at?: string;
                    description?: string | null;
                    effective_from: string;
                    general_tags?: Database["public"]["Enums"]["general_tag"][];
                    id?: string;
                    installment_count?: number;
                    monthly_day: number;
                    name: string;
                    payment_method: Database["public"]["Enums"]["payment_method"];
                    series_id: string;
                    specific_tag?: Database["public"]["Enums"]["specific_tag"] | null;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    amount_cents?: number;
                    category?: Database["public"]["Enums"]["category"];
                    created_at?: string;
                    description?: string | null;
                    effective_from?: string;
                    general_tags?: Database["public"]["Enums"]["general_tag"][];
                    id?: string;
                    installment_count?: number;
                    monthly_day?: number;
                    name?: string;
                    payment_method?: Database["public"]["Enums"]["payment_method"];
                    series_id?: string;
                    specific_tag?: Database["public"]["Enums"]["specific_tag"] | null;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "recurring_versions_series_id_fkey";
                        columns: ["series_id"];
                        isOneToOne: false;
                        referencedRelation: "recurring_series";
                        referencedColumns: ["id"];
                    },
                ];
            };
            transaction_entries: {
                Row: {
                    amount_cents: number;
                    competence_date: string;
                    created_at: string;
                    id: string;
                    installment_count: number;
                    installment_number: number;
                    invoice_due_date: string | null;
                    transaction_id: string;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    amount_cents: number;
                    competence_date: string;
                    created_at?: string;
                    id?: string;
                    installment_count: number;
                    installment_number: number;
                    invoice_due_date?: string | null;
                    transaction_id: string;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    amount_cents?: number;
                    competence_date?: string;
                    created_at?: string;
                    id?: string;
                    installment_count?: number;
                    installment_number?: number;
                    invoice_due_date?: string | null;
                    transaction_id?: string;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "transaction_entries_transaction_id_fkey";
                        columns: ["transaction_id"];
                        isOneToOne: false;
                        referencedRelation: "transactions";
                        referencedColumns: ["id"];
                    },
                ];
            };
            transactions: {
                Row: {
                    amount_cents: number;
                    category: Database["public"]["Enums"]["category"];
                    created_at: string;
                    description: string | null;
                    general_tags: Database["public"]["Enums"]["general_tag"][];
                    id: string;
                    installment_count: number;
                    name: string;
                    payment_method: Database["public"]["Enums"]["payment_method"];
                    purchase_date: string;
                    specific_tag: Database["public"]["Enums"]["specific_tag"] | null;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    amount_cents: number;
                    category: Database["public"]["Enums"]["category"];
                    created_at?: string;
                    description?: string | null;
                    general_tags?: Database["public"]["Enums"]["general_tag"][];
                    id?: string;
                    installment_count: number;
                    name: string;
                    payment_method: Database["public"]["Enums"]["payment_method"];
                    purchase_date: string;
                    specific_tag?: Database["public"]["Enums"]["specific_tag"] | null;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    amount_cents?: number;
                    category?: Database["public"]["Enums"]["category"];
                    created_at?: string;
                    description?: string | null;
                    general_tags?: Database["public"]["Enums"]["general_tag"][];
                    id?: string;
                    installment_count?: number;
                    name?: string;
                    payment_method?: Database["public"]["Enums"]["payment_method"];
                    purchase_date?: string;
                    specific_tag?: Database["public"]["Enums"]["specific_tag"] | null;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [];
            };
            user_settings: {
                Row: {
                    closing_day: number;
                    created_at: string;
                    due_day: number;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    closing_day?: number;
                    created_at?: string;
                    due_day?: number;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    closing_day?: number;
                    created_at?: string;
                    due_day?: number;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [];
            };
            user_settings_history: {
                Row: {
                    closing_day: number;
                    created_at: string;
                    due_day: number;
                    effective_from: string;
                    id: string;
                    user_id: string;
                };
                Insert: {
                    closing_day: number;
                    created_at?: string;
                    due_day: number;
                    effective_from: string;
                    id?: string;
                    user_id: string;
                };
                Update: {
                    closing_day?: number;
                    created_at?: string;
                    due_day?: number;
                    effective_from?: string;
                    id?: string;
                    user_id?: string;
                };
                Relationships: [];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            persist_recurrence: {
                Args: {
                    p_entries?: Json;
                    p_payload: Json;
                };
                Returns: string;
            };
            persist_transaction: {
                Args: {
                    p_entries: Json;
                    p_transaction: Json;
                    p_transaction_id: string | null;
                };
                Returns: string;
            };
        };
        Enums: {
            category: "fixed_expenses" | "hygiene" | "health" | "food" | "transportation" | "leisure" | "clothing" | "personal" | "gift";
            general_tag: "reimbursement" | "family" | "friends";
            payment_method: "pix" | "credit";
            specific_tag: "mobile_phone" | "energy" | "home" | "medicine" | "doctor" | "gym" | "restaurant" | "bakery_or_grocery" | "snack" | "uber" | "travel" | "subscription" | "tickets" | "other";
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
    DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
    TableName extends (DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
        : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
          Row: infer R;
      }
        ? R
        : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
      ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R;
        }
          ? R
          : never
      : never;

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
    TableName extends (DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
          Insert: infer I;
      }
        ? I
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
      ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
            Insert: infer I;
        }
          ? I
          : never
      : never;

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
    TableName extends (DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
          Update: infer U;
      }
        ? U
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
      ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
            Update: infer U;
        }
          ? U
          : never
      : never;

export type Enums<
    DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
    EnumName extends (DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
        : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
      ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
      : never;

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
        : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
      ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
      : never;

export const Constants = {
    public: {
        Enums: {
            category: ["fixed_expenses", "hygiene", "health", "food", "transportation", "leisure", "clothing", "personal", "gift"],
            general_tag: ["reimbursement", "family", "friends"],
            payment_method: ["pix", "credit"],
            specific_tag: ["mobile_phone", "energy", "home", "medicine", "doctor", "gym", "restaurant", "bakery_or_grocery", "snack", "uber", "travel", "subscription", "tickets", "other"],
        },
    },
} as const;
