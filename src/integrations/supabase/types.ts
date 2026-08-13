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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      keywords: {
        Row: {
          id: string
          label: string
          normalized_label: string | null
          owner_id: string
        }
        Insert: {
          id?: string
          label: string
          normalized_label?: string | null
          owner_id?: string
        }
        Update: {
          id?: string
          label?: string
          normalized_label?: string | null
          owner_id?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          full_name: string
          id: string
          normalized_name: string | null
          owner_id: string
        }
        Insert: {
          full_name: string
          id?: string
          normalized_name?: string | null
          owner_id?: string
        }
        Update: {
          full_name?: string
          id?: string
          normalized_name?: string | null
          owner_id?: string
        }
        Relationships: []
      }
      project_sources: {
        Row: {
          added_at: string
          project_id: string
          source_id: string
        }
        Insert: {
          added_at?: string
          project_id: string
          source_id: string
        }
        Update: {
          added_at?: string
          project_id?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_sources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          owner_id: string
          public_slug: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          owner_id?: string
          public_slug?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          owner_id?: string
          public_slug?: string | null
        }
        Relationships: []
      }
      source_abstracts: {
        Row: {
          abstract_text: string
          created_at: string
          id: string
          language: string | null
          source_id: string
        }
        Insert: {
          abstract_text: string
          created_at?: string
          id?: string
          language?: string | null
          source_id: string
        }
        Update: {
          abstract_text?: string
          created_at?: string
          id?: string
          language?: string | null
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_abstracts_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      source_keywords: {
        Row: {
          keyword_id: string
          source_id: string
        }
        Insert: {
          keyword_id: string
          source_id: string
        }
        Update: {
          keyword_id?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_keywords_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "keywords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_keywords_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      source_links: {
        Row: {
          created_at: string
          id: string
          label: string | null
          link_type: string
          source_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          link_type?: string
          source_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          link_type?: string
          source_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_links_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      source_people: {
        Row: {
          person_id: string
          position: number
          role: string
          source_id: string
        }
        Insert: {
          person_id: string
          position?: number
          role?: string
          source_id: string
        }
        Update: {
          person_id?: string
          position?: number
          role?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_people_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      source_tags: {
        Row: {
          source_id: string
          tag_id: string
        }
        Insert: {
          source_id: string
          tag_id: string
        }
        Update: {
          source_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_tags_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      source_titles: {
        Row: {
          created_at: string
          id: string
          language: string | null
          source_id: string
          title_text: string
          title_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string | null
          source_id: string
          title_text: string
          title_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string | null
          source_id?: string
          title_text?: string
          title_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_titles_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          abstract: string | null
          access_date: string | null
          chave_doc: string | null
          citation_full_abnt: string | null
          citation_integrated: string | null
          citation_parenthetical: string | null
          color_tag: string | null
          container_title: string | null
          created_at: string
          database_source: string | null
          doi: string | null
          duplicate_group_id: string | null
          duplicate_status: string | null
          external_id: string | null
          has_pdf: boolean
          id: string
          is_favorite: boolean
          is_public: boolean
          issn_isbn: string | null
          issue: string | null
          language: string | null
          months: string | null
          owner_id: string
          pages: string | null
          pdf_storage_path: string | null
          personal_notes: string | null
          place: string | null
          public_slug: string | null
          publisher: string | null
          raw_import_data: Json | null
          source_type: string
          status_reading: string
          title: string
          updated_at: string
          url: string | null
          volume: string | null
          year: number | null
        }
        Insert: {
          abstract?: string | null
          access_date?: string | null
          chave_doc?: string | null
          citation_full_abnt?: string | null
          citation_integrated?: string | null
          citation_parenthetical?: string | null
          color_tag?: string | null
          container_title?: string | null
          created_at?: string
          database_source?: string | null
          doi?: string | null
          duplicate_group_id?: string | null
          duplicate_status?: string | null
          external_id?: string | null
          has_pdf?: boolean
          id?: string
          is_favorite?: boolean
          is_public?: boolean
          issn_isbn?: string | null
          issue?: string | null
          language?: string | null
          months?: string | null
          owner_id?: string
          pages?: string | null
          pdf_storage_path?: string | null
          personal_notes?: string | null
          place?: string | null
          public_slug?: string | null
          publisher?: string | null
          raw_import_data?: Json | null
          source_type?: string
          status_reading?: string
          title: string
          updated_at?: string
          url?: string | null
          volume?: string | null
          year?: number | null
        }
        Update: {
          abstract?: string | null
          access_date?: string | null
          chave_doc?: string | null
          citation_full_abnt?: string | null
          citation_integrated?: string | null
          citation_parenthetical?: string | null
          color_tag?: string | null
          container_title?: string | null
          created_at?: string
          database_source?: string | null
          doi?: string | null
          duplicate_group_id?: string | null
          duplicate_status?: string | null
          external_id?: string | null
          has_pdf?: boolean
          id?: string
          is_favorite?: boolean
          is_public?: boolean
          issn_isbn?: string | null
          issue?: string | null
          language?: string | null
          months?: string | null
          owner_id?: string
          pages?: string | null
          pdf_storage_path?: string | null
          personal_notes?: string | null
          place?: string | null
          public_slug?: string | null
          publisher?: string | null
          raw_import_data?: Json | null
          source_type?: string
          status_reading?: string
          title?: string
          updated_at?: string
          url?: string | null
          volume?: string | null
          year?: number | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          id: string
          label: string
          owner_id: string
        }
        Insert: {
          color?: string | null
          id?: string
          label: string
          owner_id?: string
        }
        Update: {
          color?: string | null
          id?: string
          label?: string
          owner_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          owner_id: string
          updated_at: string
          visible_columns: Json
        }
        Insert: {
          owner_id?: string
          updated_at?: string
          visible_columns?: Json
        }
        Update: {
          owner_id?: string
          updated_at?: string
          visible_columns?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
