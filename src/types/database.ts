// Tipos de la base de datos con la misma forma que genera
// `npx supabase gen types typescript --project-id <id> > src/types/database.ts`.
// Regenera este archivo cuando cambie el esquema.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          currency: string;
          timezone: string;
          payday: number;
          needs_pct: number;
          wants_pct: number;
          savings_pct: number;
          alert_threshold_pct: number;
          created_at: string;
        };
        Insert: {
          id: string;
          currency?: string;
          timezone?: string;
          payday?: number;
          needs_pct?: number;
          wants_pct?: number;
          savings_pct?: number;
          alert_threshold_pct?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: Database["public"]["Enums"]["account_type"];
          initial_balance: number;
          credit_limit: number | null;
          is_archived: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          type: Database["public"]["Enums"]["account_type"];
          initial_balance?: number;
          credit_limit?: number | null;
          is_archived?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["accounts"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          parent_id: string | null;
          name: string;
          kind: Database["public"]["Enums"]["transaction_kind"];
          bucket: Database["public"]["Enums"]["rule_bucket"] | null;
          target_pct: number | null;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          parent_id?: string | null;
          name: string;
          kind: Database["public"]["Enums"]["transaction_kind"];
          bucket?: Database["public"]["Enums"]["rule_bucket"] | null;
          target_pct?: number | null;
          color?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          category_id: string;
          kind: Database["public"]["Enums"]["transaction_kind"];
          amount: number;
          occurred_on: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          account_id: string;
          category_id: string;
          // Lo fija un trigger a partir de la categoría.
          kind?: Database["public"]["Enums"]["transaction_kind"];
          amount: number;
          occurred_on?: string;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      transfers: {
        Row: {
          id: string;
          user_id: string;
          from_account_id: string;
          to_account_id: string;
          amount: number;
          occurred_on: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          from_account_id: string;
          to_account_id: string;
          amount: number;
          occurred_on?: string;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transfers"]["Insert"]>;
        Relationships: [];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          period_start: string | null;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          category_id?: string | null;
          period_start?: string | null;
          amount: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["budgets"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      cycle_rule_totals: {
        Args: { p_from: string; p_to: string };
        Returns: {
          cycle_start: string;
          income: number;
          needs: number;
          wants: number;
          savings: number;
        }[];
      };
      category_spending: {
        Args: { p_from: string; p_to: string };
        Returns: { category_id: string; spent: number }[];
      };
      account_balances: {
        Args: Record<PropertyKey, never>;
        Returns: { account_id: string; balance: number }[];
      };
      pay_cycle_start: {
        Args: { p_date: string; p_payday: number };
        Returns: string;
      };
    };
    Enums: {
      transaction_kind: "income" | "expense";
      rule_bucket: "needs" | "wants" | "savings";
      account_type:
        | "cash"
        | "checking"
        | "savings"
        | "credit_card"
        | "debit_card"
        | "digital_wallet"
        | "investment";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
