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
  public: {
    Tables: {
      ai_providers: {
        Row: {
          base_url: string
          enabled: boolean
          id: string
          kind: string
          notes: string | null
          secret_name: string
        }
        Insert: {
          base_url: string
          enabled?: boolean
          id: string
          kind?: string
          notes?: string | null
          secret_name: string
        }
        Update: {
          base_url?: string
          enabled?: boolean
          id?: string
          kind?: string
          notes?: string | null
          secret_name?: string
        }
        Relationships: []
      }
      benchmark_cases: {
        Row: {
          category: string
          expected: Json
          id: string
          notes: string | null
          question: string
        }
        Insert: {
          category: string
          expected: Json
          id: string
          notes?: string | null
          question: string
        }
        Update: {
          category?: string
          expected?: Json
          id?: string
          notes?: string | null
          question?: string
        }
        Relationships: []
      }
      benchmark_runs: {
        Row: {
          created_at: string
          engine_version: string | null
          id: string
          results: Json
          summary: Json
        }
        Insert: {
          created_at?: string
          engine_version?: string | null
          id?: string
          results: Json
          summary: Json
        }
        Update: {
          created_at?: string
          engine_version?: string | null
          id?: string
          results?: Json
          summary?: Json
        }
        Relationships: []
      }
      company_titles: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      compound_synonyms: {
        Row: {
          compound_id: string
          synonym: string
        }
        Insert: {
          compound_id: string
          synonym: string
        }
        Update: {
          compound_id?: string
          synonym?: string
        }
        Relationships: [
          {
            foreignKeyName: "compound_synonyms_compound_id_fkey"
            columns: ["compound_id"]
            isOneToOne: false
            referencedRelation: "compounds"
            referencedColumns: ["id"]
          },
        ]
      }
      compounds: {
        Row: {
          canonical_smiles: string
          formula: string | null
          id: string
          inchi: string | null
          inchikey: string | null
          mw: number | null
          name: string | null
          properties: Json
          pubchem_cid: number | null
          source: string
          updated_at: string
        }
        Insert: {
          canonical_smiles: string
          formula?: string | null
          id?: string
          inchi?: string | null
          inchikey?: string | null
          mw?: number | null
          name?: string | null
          properties?: Json
          pubchem_cid?: number | null
          source?: string
          updated_at?: string
        }
        Update: {
          canonical_smiles?: string
          formula?: string | null
          id?: string
          inchi?: string | null
          inchikey?: string | null
          mw?: number | null
          name?: string | null
          properties?: Json
          pubchem_cid?: number | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          answer: string
          correction: string | null
          created_at: string
          id: string
          question: string
          rating: string
          reason: string | null
          source: string | null
          status: string
          user_id: string
        }
        Insert: {
          answer: string
          correction?: string | null
          created_at?: string
          id?: string
          question: string
          rating: string
          reason?: string | null
          source?: string | null
          status?: string
          user_id: string
        }
        Update: {
          answer?: string
          correction?: string | null
          created_at?: string
          id?: string
          question?: string
          rating?: string
          reason?: string | null
          source?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      graph_edges: {
        Row: {
          from_id: string
          from_type: string
          id: string
          relation: string
          source: string | null
          to_id: string
          to_type: string
        }
        Insert: {
          from_id: string
          from_type: string
          id?: string
          relation: string
          source?: string | null
          to_id: string
          to_type: string
        }
        Update: {
          from_id?: string
          from_type?: string
          id?: string
          relation?: string
          source?: string | null
          to_id?: string
          to_type?: string
        }
        Relationships: []
      }
      literature_chunks: {
        Row: {
          chunk_index: number
          content: string
          doc_id: string
          embed_model: string | null
          embedding: string | null
          id: string
          tsv: unknown
        }
        Insert: {
          chunk_index: number
          content: string
          doc_id: string
          embed_model?: string | null
          embedding?: string | null
          id?: string
          tsv?: unknown
        }
        Update: {
          chunk_index?: number
          content?: string
          doc_id?: string
          embed_model?: string | null
          embedding?: string | null
          id?: string
          tsv?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "literature_chunks_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "literature_docs"
            referencedColumns: ["id"]
          },
        ]
      }
      literature_docs: {
        Row: {
          abstract: string | null
          created_at: string
          doi: string | null
          entities: string[]
          external_id: string
          id: string
          journal: string | null
          source: string
          title: string
          url: string | null
          year: number | null
        }
        Insert: {
          abstract?: string | null
          created_at?: string
          doi?: string | null
          entities?: string[]
          external_id: string
          id?: string
          journal?: string | null
          source: string
          title: string
          url?: string | null
          year?: number | null
        }
        Update: {
          abstract?: string | null
          created_at?: string
          doi?: string | null
          entities?: string[]
          external_id?: string
          id?: string
          journal?: string | null
          source?: string
          title?: string
          url?: string | null
          year?: number | null
        }
        Relationships: []
      }
      model_routes: {
        Row: {
          enabled: boolean
          model: string
          priority: number
          provider_id: string
          task: string
        }
        Insert: {
          enabled?: boolean
          model: string
          priority?: number
          provider_id: string
          task: string
        }
        Update: {
          enabled?: boolean
          model?: string
          priority?: number
          provider_id?: string
          task?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_routes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          disabled: boolean
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          disabled?: boolean
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          disabled?: boolean
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      project_items: {
        Row: {
          created_at: string
          id: string
          item_type: string
          payload: Json
          project_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_type: string
          payload?: Json
          project_id: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_type?: string
          payload?: Json
          project_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          client_key: string
          created_at: string
          id: number
        }
        Insert: {
          client_key: string
          created_at?: string
          id?: number
        }
        Update: {
          client_key?: string
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      reaction_conditions: {
        Row: {
          atmosphere: string | null
          catalyst: string | null
          evidence_level: string
          id: string
          pressure: string | null
          reaction_id: string | null
          reagents: string | null
          solvent: string | null
          source: string | null
          temperature: string | null
          time: string | null
          yield_percent: number | null
        }
        Insert: {
          atmosphere?: string | null
          catalyst?: string | null
          evidence_level?: string
          id?: string
          pressure?: string | null
          reaction_id?: string | null
          reagents?: string | null
          solvent?: string | null
          source?: string | null
          temperature?: string | null
          time?: string | null
          yield_percent?: number | null
        }
        Update: {
          atmosphere?: string | null
          catalyst?: string | null
          evidence_level?: string
          id?: string
          pressure?: string | null
          reaction_id?: string | null
          reagents?: string | null
          solvent?: string | null
          source?: string | null
          temperature?: string | null
          time?: string | null
          yield_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reaction_conditions_reaction_id_fkey"
            columns: ["reaction_id"]
            isOneToOne: false
            referencedRelation: "reactions"
            referencedColumns: ["id"]
          },
        ]
      }
      reaction_participants: {
        Row: {
          name: string | null
          reaction_id: string
          role: string
          smiles: string
        }
        Insert: {
          name?: string | null
          reaction_id: string
          role: string
          smiles: string
        }
        Update: {
          name?: string | null
          reaction_id?: string
          role?: string
          smiles?: string
        }
        Relationships: [
          {
            foreignKeyName: "reaction_participants_reaction_id_fkey"
            columns: ["reaction_id"]
            isOneToOne: false
            referencedRelation: "reactions"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string
          doi: string | null
          evidence_level: string
          id: string
          name: string | null
          product_smiles: string
          reaction_class: string | null
          reaction_smiles: string
          source: string | null
        }
        Insert: {
          created_at?: string
          doi?: string | null
          evidence_level?: string
          id?: string
          name?: string | null
          product_smiles: string
          reaction_class?: string | null
          reaction_smiles: string
          source?: string | null
        }
        Update: {
          created_at?: string
          doi?: string | null
          evidence_level?: string
          id?: string
          name?: string | null
          product_smiles?: string
          reaction_class?: string | null
          reaction_smiles?: string
          source?: string | null
        }
        Relationships: []
      }
      request_log: {
        Row: {
          client_key: string | null
          created_at: string
          detail: string | null
          function_name: string
          id: number
          latency_ms: number | null
          model: string | null
          ok: boolean | null
          provider: string | null
          task: string | null
          user_id: string | null
        }
        Insert: {
          client_key?: string | null
          created_at?: string
          detail?: string | null
          function_name: string
          id?: number
          latency_ms?: number | null
          model?: string | null
          ok?: boolean | null
          provider?: string | null
          task?: string | null
          user_id?: string | null
        }
        Update: {
          client_key?: string | null
          created_at?: string
          detail?: string | null
          function_name?: string
          id?: number
          latency_ms?: number | null
          model?: string | null
          ok?: boolean | null
          provider?: string | null
          task?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      retrosynthesis_cache: {
        Row: {
          canonical_smiles: string
          created_at: string
          engine: string
          id: string
          payload: Json
          updated_at: string
        }
        Insert: {
          canonical_smiles: string
          created_at?: string
          engine?: string
          id?: string
          payload: Json
          updated_at?: string
        }
        Update: {
          canonical_smiles?: string
          created_at?: string
          engine?: string
          id?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      runs: {
        Row: {
          batch_size_mg: number
          created_at: string
          id: string
          location: string
          molecule_name: string
          recommended_route_name: string
          results: Json
          user_id: string
        }
        Insert: {
          batch_size_mg: number
          created_at?: string
          id?: string
          location: string
          molecule_name: string
          recommended_route_name: string
          results: Json
          user_id: string
        }
        Update: {
          batch_size_mg?: number
          created_at?: string
          id?: string
          location?: string
          molecule_name?: string
          recommended_route_name?: string
          results?: Json
          user_id?: string
        }
        Relationships: []
      }
      search_cache: {
        Row: {
          cache_key: string
          created_at: string
          payload: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          payload: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          payload?: Json
        }
        Relationships: []
      }
      supplier_products: {
        Row: {
          aliases: string[]
          cas: string | null
          currency: string
          grade: string | null
          id: string
          material_key: string
          pack_size: string
          price: number | null
          price_note: string
          product_name: string
          product_url: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          cas?: string | null
          currency?: string
          grade?: string | null
          id?: string
          material_key: string
          pack_size: string
          price?: number | null
          price_note?: string
          product_name: string
          product_url: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          cas?: string | null
          currency?: string
          grade?: string | null
          id?: string
          material_key?: string
          pack_size?: string
          price?: number | null
          price_note?: string
          product_name?: string
          product_url?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          country: string
          id: string
          kind: string
          name: string
          website: string
        }
        Insert: {
          country: string
          id: string
          kind?: string
          name: string
          website: string
        }
        Update: {
          country?: string
          id?: string
          kind?: string
          name?: string
          website?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_titles: {
        Row: {
          title_id: string
          user_id: string
        }
        Insert: {
          title_id: string
          user_id: string
        }
        Update: {
          title_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_titles_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "company_titles"
            referencedColumns: ["id"]
          },
        ]
      }
      validated_facts: {
        Row: {
          created_at: string
          id: string
          origin: string
          source: string
          statement: string
          subject: string
          validated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          origin: string
          source: string
          statement: string
          subject: string
          validated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          origin?: string
          source?: string
          statement?: string
          subject?: string
          validated_by?: string | null
        }
        Relationships: []
      }
      verified_routes: {
        Row: {
          canonical_smiles: string
          common_name: string
          created_at: string
          id: string
          references_text: string | null
          routes: Json
          updated_at: string
        }
        Insert: {
          canonical_smiles: string
          common_name: string
          created_at?: string
          id?: string
          references_text?: string | null
          routes: Json
          updated_at?: string
        }
        Update: {
          canonical_smiles?: string
          common_name?: string
          created_at?: string
          id?: string
          references_text?: string | null
          routes?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hybrid_search_chunks: {
        Args: {
          match_count?: number
          query_embedding: string
          query_text: string
        }
        Returns: {
          chunk_id: string
          content: string
          doc_id: string
          score: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "client"
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
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "client"],
    },
  },
} as const
