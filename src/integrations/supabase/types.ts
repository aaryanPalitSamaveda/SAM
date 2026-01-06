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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      campaign_contacts: {
        Row: {
          campaign_id: string
          completed_at: string | null
          contact_id: string
          current_sequence_step: number
          enrolled_at: string
          id: string
          last_email_sent_at: string | null
          replied_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          completed_at?: string | null
          contact_id: string
          current_sequence_step?: number
          enrolled_at?: string
          id?: string
          last_email_sent_at?: string | null
          replied_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          completed_at?: string | null
          contact_id?: string
          current_sequence_step?: number
          enrolled_at?: string
          id?: string
          last_email_sent_at?: string | null
          replied_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_sequences: {
        Row: {
          body_template: string
          campaign_id: string
          created_at: string
          delay_days: number
          delay_hours: number
          id: string
          name: string
          sequence_order: number
          subject_template: string
        }
        Insert: {
          body_template: string
          campaign_id: string
          created_at?: string
          delay_days?: number
          delay_hours?: number
          id?: string
          name: string
          sequence_order: number
          subject_template: string
        }
        Update: {
          body_template?: string
          campaign_id?: string
          created_at?: string
          delay_days?: number
          delay_hours?: number
          id?: string
          name?: string
          sequence_order?: number
          subject_template?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sequences_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_settings: {
        Row: {
          campaign_id: string
          created_at: string
          daily_limit: number
          delay_between_emails_seconds: number
          id: string
          send_days: string[]
          send_window_end: string
          send_window_start: string
          timezone: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          daily_limit?: number
          delay_between_emails_seconds?: number
          id?: string
          send_days?: string[]
          send_window_end?: string
          send_window_start?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          daily_limit?: number
          delay_between_emails_seconds?: number
          id?: string
          send_days?: string[]
          send_window_end?: string
          send_window_start?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_settings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          description: string | null
          id: string
          list_id: string | null
          name: string
          sender_account_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          list_id?: string | null
          name: string
          sender_account_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          list_id?: string | null
          name?: string
          sender_account_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_sender_account_id_fkey"
            columns: ["sender_account_id"]
            isOneToOne: false
            referencedRelation: "sender_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_list_members: {
        Row: {
          added_at: string
          contact_id: string
          id: string
          list_id: string
        }
        Insert: {
          added_at?: string
          contact_id: string
          id?: string
          list_id: string
        }
        Update: {
          added_at?: string
          contact_id?: string
          id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_list_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_lists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string
          enriched_data: Json | null
          id: string
          name: string | null
          raw_data: Json
          upload_batch_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          enriched_data?: Json | null
          id?: string
          name?: string | null
          raw_data: Json
          upload_batch_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          enriched_data?: Json | null
          id?: string
          name?: string | null
          raw_data?: Json
          upload_batch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_contacts_batch"
            columns: ["upload_batch_id"]
            isOneToOne: false
            referencedRelation: "upload_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      email_analytics: {
        Row: {
          created_at: string
          date: string
          id: string
          total_drafts_approved: number | null
          total_drafts_created: number | null
          total_emails_sent: number | null
          total_followups_sent: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          total_drafts_approved?: number | null
          total_drafts_created?: number | null
          total_emails_sent?: number | null
          total_followups_sent?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          total_drafts_approved?: number | null
          total_drafts_created?: number | null
          total_emails_sent?: number | null
          total_followups_sent?: number | null
        }
        Relationships: []
      }
      email_drafts: {
        Row: {
          approved_at: string | null
          body: string
          contact_id: string
          created_at: string
          draft_type: Database["public"]["Enums"]["draft_type"]
          edited_body: string | null
          edited_subject: string | null
          id: string
          status: Database["public"]["Enums"]["email_status"] | null
          subject: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          body: string
          contact_id: string
          created_at?: string
          draft_type: Database["public"]["Enums"]["draft_type"]
          edited_body?: string | null
          edited_subject?: string | null
          id?: string
          status?: Database["public"]["Enums"]["email_status"] | null
          subject: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          body?: string
          contact_id?: string
          created_at?: string
          draft_type?: Database["public"]["Enums"]["draft_type"]
          edited_body?: string | null
          edited_subject?: string | null
          id?: string
          status?: Database["public"]["Enums"]["email_status"] | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_drafts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_replies: {
        Row: {
          campaign_id: string | null
          contact_id: string
          created_at: string
          id: string
          message_id: string | null
          received_at: string
          sent_email_id: string | null
          snippet: string | null
          subject: string | null
        }
        Insert: {
          campaign_id?: string | null
          contact_id: string
          created_at?: string
          id?: string
          message_id?: string | null
          received_at?: string
          sent_email_id?: string | null
          snippet?: string | null
          subject?: string | null
        }
        Update: {
          campaign_id?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          message_id?: string | null
          received_at?: string
          sent_email_id?: string | null
          snippet?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_replies_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_replies_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_replies_sent_email_id_fkey"
            columns: ["sent_email_id"]
            isOneToOne: false
            referencedRelation: "sent_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          template_content: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          template_content: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          template_content?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_emails: {
        Row: {
          contact_id: string
          created_at: string
          draft_id: string
          id: string
          scheduled_for: string
          sender_account_id: string
          status: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          draft_id: string
          id?: string
          scheduled_for: string
          sender_account_id: string
          status?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          draft_id?: string
          id?: string
          scheduled_for?: string
          sender_account_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_emails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_emails_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "email_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_emails_sender_account_id_fkey"
            columns: ["sender_account_id"]
            isOneToOne: false
            referencedRelation: "sender_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sender_accounts: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          is_active: boolean | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          is_active?: boolean | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      sent_emails: {
        Row: {
          body: string
          campaign_id: string | null
          contact_id: string
          draft_id: string | null
          draft_type: Database["public"]["Enums"]["draft_type"]
          id: string
          message_id: string | null
          recipient_email: string
          sender_account_id: string
          sent_at: string
          sequence_step: number | null
          status: string | null
          subject: string
        }
        Insert: {
          body: string
          campaign_id?: string | null
          contact_id: string
          draft_id?: string | null
          draft_type: Database["public"]["Enums"]["draft_type"]
          id?: string
          message_id?: string | null
          recipient_email: string
          sender_account_id: string
          sent_at?: string
          sequence_step?: number | null
          status?: string | null
          subject: string
        }
        Update: {
          body?: string
          campaign_id?: string | null
          contact_id?: string
          draft_id?: string | null
          draft_type?: Database["public"]["Enums"]["draft_type"]
          id?: string
          message_id?: string | null
          recipient_email?: string
          sender_account_id?: string
          sent_at?: string
          sequence_step?: number | null
          status?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "sent_emails_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_emails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_emails_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "email_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_emails_sender_account_id_fkey"
            columns: ["sender_account_id"]
            isOneToOne: false
            referencedRelation: "sender_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_batches: {
        Row: {
          column_mapping: Json | null
          created_at: string
          file_name: string
          id: string
          processed_contacts: number | null
          status: string | null
          total_contacts: number | null
        }
        Insert: {
          column_mapping?: Json | null
          created_at?: string
          file_name: string
          id?: string
          processed_contacts?: number | null
          status?: string | null
          total_contacts?: number | null
        }
        Update: {
          column_mapping?: Json | null
          created_at?: string
          file_name?: string
          id?: string
          processed_contacts?: number | null
          status?: string | null
          total_contacts?: number | null
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
      draft_type: "first_outreach" | "second_followup" | "final_followup"
      email_status: "draft" | "approved" | "sent" | "failed" | "scheduled"
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
    Enums: {
      draft_type: ["first_outreach", "second_followup", "final_followup"],
      email_status: ["draft", "approved", "sent", "failed", "scheduled"],
    },
  },
} as const
