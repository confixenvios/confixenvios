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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_type: string
          cep: string
          city: string
          complement: string | null
          created_at: string
          id: string
          name: string
          neighborhood: string
          number: string
          reference: string | null
          secure_data_id: string | null
          session_id: string | null
          state: string
          street: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address_type: string
          cep: string
          city: string
          complement?: string | null
          created_at?: string
          id?: string
          name: string
          neighborhood: string
          number: string
          reference?: string | null
          secure_data_id?: string | null
          session_id?: string | null
          state: string
          street: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address_type?: string
          cep?: string
          city?: string
          complement?: string | null
          created_at?: string
          id?: string
          name?: string
          neighborhood?: string
          number?: string
          reference?: string | null
          secure_data_id?: string | null
          session_id?: string | null
          state?: string
          street?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_secure_data_id_fkey"
            columns: ["secure_data_id"]
            isOneToOne: false
            referencedRelation: "secure_personal_data"
            referencedColumns: ["id"]
          },
        ]
      }
      anonymous_sessions: {
        Row: {
          client_fingerprint: string | null
          created_at: string
          expires_at: string
          id: string
          last_accessed: string
          session_hash: string
          session_token: string
        }
        Insert: {
          client_fingerprint?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          last_accessed?: string
          session_hash: string
          session_token: string
        }
        Update: {
          client_fingerprint?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          last_accessed?: string
          session_hash?: string
          session_token?: string
        }
        Relationships: []
      }
      integration_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          integration_id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          integration_id: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          integration_id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          active: boolean | null
          created_at: string
          encrypted_secret_key: string | null
          id: string
          name: string
          secret_key: string | null
          updated_at: string
          webhook_url: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          encrypted_secret_key?: string | null
          id?: string
          name: string
          secret_key?: string | null
          updated_at?: string
          webhook_url: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          encrypted_secret_key?: string | null
          id?: string
          name?: string
          secret_key?: string | null
          updated_at?: string
          webhook_url?: string
        }
        Relationships: []
      }
      motoristas: {
        Row: {
          cpf: string
          created_at: string
          email: string
          id: string
          nome: string
          senha: string
          status: string
          telefone: string
          updated_at: string
        }
        Insert: {
          cpf: string
          created_at?: string
          email: string
          id?: string
          nome: string
          senha: string
          status?: string
          telefone: string
          updated_at?: string
        }
        Update: {
          cpf?: string
          created_at?: string
          email?: string
          id?: string
          nome?: string
          senha?: string
          status?: string
          telefone?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          document: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      saved_recipients: {
        Row: {
          cep: string
          city: string
          complement: string | null
          created_at: string
          document: string
          email: string
          id: string
          is_default: boolean | null
          name: string
          neighborhood: string
          number: string
          phone: string
          reference: string | null
          state: string
          street: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cep: string
          city: string
          complement?: string | null
          created_at?: string
          document: string
          email: string
          id?: string
          is_default?: boolean | null
          name: string
          neighborhood: string
          number: string
          phone: string
          reference?: string | null
          state: string
          street: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cep?: string
          city?: string
          complement?: string | null
          created_at?: string
          document?: string
          email?: string
          id?: string
          is_default?: boolean | null
          name?: string
          neighborhood?: string
          number?: string
          phone?: string
          reference?: string | null
          state?: string
          street?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      saved_senders: {
        Row: {
          cep: string
          city: string
          complement: string | null
          created_at: string
          document: string
          email: string
          id: string
          is_default: boolean | null
          name: string
          neighborhood: string
          number: string
          phone: string
          reference: string | null
          state: string
          street: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cep: string
          city: string
          complement?: string | null
          created_at?: string
          document: string
          email: string
          id?: string
          is_default?: boolean | null
          name: string
          neighborhood: string
          number: string
          phone: string
          reference?: string | null
          state: string
          street: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cep?: string
          city?: string
          complement?: string | null
          created_at?: string
          document?: string
          email?: string
          id?: string
          is_default?: boolean | null
          name?: string
          neighborhood?: string
          number?: string
          phone?: string
          reference?: string | null
          state?: string
          street?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      secure_personal_data: {
        Row: {
          access_level: string
          address_id: string
          created_at: string
          data_hash: string
          encrypted_document: string | null
          encrypted_email: string | null
          encrypted_phone: string | null
          id: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          address_id: string
          created_at?: string
          data_hash: string
          encrypted_document?: string | null
          encrypted_email?: string | null
          encrypted_phone?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          address_id?: string
          created_at?: string
          data_hash?: string
          encrypted_document?: string | null
          encrypted_email?: string | null
          encrypted_phone?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipment_status_history: {
        Row: {
          created_at: string
          id: string
          motorista_id: string | null
          observacoes: string | null
          shipment_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          motorista_id?: string | null
          observacoes?: string | null
          shipment_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          motorista_id?: string | null
          observacoes?: string | null
          shipment_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_status_history_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_status_history_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          created_at: string
          cte_key: string | null
          format: string
          height: number
          id: string
          label_pdf_url: string | null
          length: number
          motorista_id: string | null
          payment_data: Json | null
          pickup_option: string
          quote_data: Json
          recipient_address_id: string
          selected_option: string
          sender_address_id: string
          status: string
          tracking_code: string | null
          updated_at: string
          user_id: string | null
          weight: number
          width: number
        }
        Insert: {
          created_at?: string
          cte_key?: string | null
          format: string
          height: number
          id?: string
          label_pdf_url?: string | null
          length: number
          motorista_id?: string | null
          payment_data?: Json | null
          pickup_option: string
          quote_data: Json
          recipient_address_id: string
          selected_option: string
          sender_address_id: string
          status?: string
          tracking_code?: string | null
          updated_at?: string
          user_id?: string | null
          weight: number
          width: number
        }
        Update: {
          created_at?: string
          cte_key?: string | null
          format?: string
          height?: number
          id?: string
          label_pdf_url?: string | null
          length?: number
          motorista_id?: string | null
          payment_data?: Json | null
          pickup_option?: string
          quote_data?: Json
          recipient_address_id?: string
          selected_option?: string
          sender_address_id?: string
          status?: string
          tracking_code?: string | null
          updated_at?: string
          user_id?: string | null
          weight?: number
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "shipments_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_recipient_address_id_fkey"
            columns: ["recipient_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_sender_address_id_fkey"
            columns: ["sender_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_pricing: {
        Row: {
          created_at: string
          id: string
          price: number
          updated_at: string
          weight_max: number
          weight_min: number
          zone_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          price: number
          updated_at?: string
          weight_max: number
          weight_min: number
          zone_code: string
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          updated_at?: string
          weight_max?: number
          weight_min?: number
          zone_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_pricing_zone_code_fkey"
            columns: ["zone_code"]
            isOneToOne: false
            referencedRelation: "shipping_zones"
            referencedColumns: ["zone_code"]
          },
        ]
      }
      shipping_zones: {
        Row: {
          cep_end: string
          cep_start: string
          created_at: string
          delivery_days: number
          express_delivery_days: number
          id: string
          state: string
          updated_at: string
          zone_code: string
          zone_number: string | null
          zone_type: string
        }
        Insert: {
          cep_end: string
          cep_start: string
          created_at?: string
          delivery_days?: number
          express_delivery_days?: number
          id?: string
          state: string
          updated_at?: string
          zone_code: string
          zone_number?: string | null
          zone_type: string
        }
        Update: {
          cep_end?: string
          cep_start?: string
          created_at?: string
          delivery_days?: number
          express_delivery_days?: number
          id?: string
          state?: string
          updated_at?: string
          zone_code?: string
          zone_number?: string | null
          zone_type?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          response_body: Json | null
          response_status: number
          shipment_id: string
          source_ip: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          response_body?: Json | null
          response_status: number
          shipment_id: string
          source_ip?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          response_body?: Json | null
          response_status?: number
          shipment_id?: string
          source_ip?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      authenticate_motorista: {
        Args: { input_email: string; input_senha: string }
        Returns: {
          motorista_id: string
          nome: string
          status: string
        }[]
      }
      cleanup_anonymous_addresses: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_anonymous_session: {
        Args: { client_fingerprint?: string }
        Returns: {
          session_id: string
          session_token: string
        }[]
      }
      decrypt_integration_secret: {
        Args: { encrypted_value: string; integration_id: string }
        Returns: string
      }
      decrypt_personal_data: {
        Args: { data_id: string }
        Returns: {
          document: string
          email: string
          phone: string
        }[]
      }
      encrypt_integration_secret: {
        Args: { integration_id: string; secret_value: string }
        Returns: string
      }
      encrypt_personal_data: {
        Args: {
          address_ref: string
          raw_document: string
          raw_email: string
          raw_phone: string
        }
        Returns: string
      }
      generate_tracking_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_session_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_masked_personal_data: {
        Args: { address_ref: string }
        Returns: {
          email_domain: string
          masked_document: string
          masked_phone: string
        }[]
      }
      get_secure_integrations: {
        Args: Record<PropertyKey, never>
        Returns: {
          active: boolean
          created_at: string
          id: string
          name: string
          secret_status: string
          updated_at: string
          webhook_url: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      promote_to_admin: {
        Args: { user_email: string }
        Returns: undefined
      }
      validate_anonymous_session: {
        Args: { session_token: string }
        Returns: string
      }
      validate_session_with_rate_limiting: {
        Args: { client_ip?: string; session_token: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
