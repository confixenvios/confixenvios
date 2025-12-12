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
      ai_quote_config: {
        Row: {
          additional_rules: string | null
          consider_chemical_transport: boolean | null
          created_at: string
          decision_criteria: Json | null
          id: string
          is_active: boolean
          max_tokens: number | null
          model: string | null
          prefer_no_dimension_restrictions: boolean | null
          preferred_carriers: Json | null
          priority_mode: string
          system_prompt: string | null
          temperature: number | null
          updated_at: string
          weight_calculation_mode: string
        }
        Insert: {
          additional_rules?: string | null
          consider_chemical_transport?: boolean | null
          created_at?: string
          decision_criteria?: Json | null
          id?: string
          is_active?: boolean
          max_tokens?: number | null
          model?: string | null
          prefer_no_dimension_restrictions?: boolean | null
          preferred_carriers?: Json | null
          priority_mode?: string
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string
          weight_calculation_mode?: string
        }
        Update: {
          additional_rules?: string | null
          consider_chemical_transport?: boolean | null
          created_at?: string
          decision_criteria?: Json | null
          id?: string
          is_active?: boolean
          max_tokens?: number | null
          model?: string | null
          prefer_no_dimension_restrictions?: boolean | null
          preferred_carriers?: Json | null
          priority_mode?: string
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string
          weight_calculation_mode?: string
        }
        Relationships: []
      }
      ai_quote_logs: {
        Row: {
          additionals_applied: Json | null
          all_options_analyzed: Json | null
          base_price: number
          created_at: string
          delivery_days: number
          destination_cep: string
          final_price: number
          id: string
          origin_cep: string
          priority_used: string
          selected_pricing_table_id: string | null
          selected_pricing_table_name: string | null
          session_id: string | null
          total_volume: number
          total_weight: number
          user_id: string | null
          volumes_data: Json
        }
        Insert: {
          additionals_applied?: Json | null
          all_options_analyzed?: Json | null
          base_price: number
          created_at?: string
          delivery_days: number
          destination_cep: string
          final_price: number
          id?: string
          origin_cep: string
          priority_used: string
          selected_pricing_table_id?: string | null
          selected_pricing_table_name?: string | null
          session_id?: string | null
          total_volume: number
          total_weight: number
          user_id?: string | null
          volumes_data: Json
        }
        Update: {
          additionals_applied?: Json | null
          all_options_analyzed?: Json | null
          base_price?: number
          created_at?: string
          delivery_days?: number
          destination_cep?: string
          final_price?: number
          id?: string
          origin_cep?: string
          priority_used?: string
          selected_pricing_table_id?: string | null
          selected_pricing_table_name?: string | null
          session_id?: string | null
          total_volume?: number
          total_weight?: number
          user_id?: string | null
          volumes_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_quote_logs_selected_pricing_table_id_fkey"
            columns: ["selected_pricing_table_id"]
            isOneToOne: false
            referencedRelation: "pricing_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      alfa_pricing: {
        Row: {
          created_at: string | null
          destination_state: string
          id: string
          origin_state: string
          price: number
          tariff_type: string
          updated_at: string | null
          weight_max: number
          weight_min: number
        }
        Insert: {
          created_at?: string | null
          destination_state: string
          id?: string
          origin_state?: string
          price: number
          tariff_type?: string
          updated_at?: string | null
          weight_max: number
          weight_min: number
        }
        Update: {
          created_at?: string | null
          destination_state?: string
          id?: string
          origin_state?: string
          price?: number
          tariff_type?: string
          updated_at?: string | null
          weight_max?: number
          weight_min?: number
        }
        Relationships: []
      }
      alfa_zones: {
        Row: {
          cep_end: string | null
          cep_start: string | null
          created_at: string | null
          delivery_days: number
          express_delivery_days: number
          id: string
          state: string
          tariff_type: string
          updated_at: string | null
          zone_code: string
          zone_type: string
        }
        Insert: {
          cep_end?: string | null
          cep_start?: string | null
          created_at?: string | null
          delivery_days?: number
          express_delivery_days?: number
          id?: string
          state: string
          tariff_type?: string
          updated_at?: string | null
          zone_code: string
          zone_type?: string
        }
        Update: {
          cep_end?: string | null
          cep_start?: string | null
          created_at?: string | null
          delivery_days?: number
          express_delivery_days?: number
          id?: string
          state?: string
          tariff_type?: string
          updated_at?: string | null
          zone_code?: string
          zone_type?: string
        }
        Relationships: []
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
      api_keys: {
        Row: {
          api_key: string
          company_cnpj: string | null
          company_name: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          rate_limit_per_hour: number
          updated_at: string
          usage_count: number
        }
        Insert: {
          api_key: string
          company_cnpj?: string | null
          company_name: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          rate_limit_per_hour?: number
          updated_at?: string
          usage_count?: number
        }
        Update: {
          api_key?: string
          company_cnpj?: string | null
          company_name?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          rate_limit_per_hour?: number
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          api_key_id: string
          created_at: string
          endpoint: string
          execution_time_ms: number | null
          id: string
          ip_address: string | null
          method: string
          request_body: Json | null
          response_body: Json | null
          response_status: number
          user_agent: string | null
        }
        Insert: {
          api_key_id: string
          created_at?: string
          endpoint: string
          execution_time_ms?: number | null
          id?: string
          ip_address?: string | null
          method: string
          request_body?: Json | null
          response_body?: Json | null
          response_status: number
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string
          created_at?: string
          endpoint?: string
          execution_time_ms?: number | null
          id?: string
          ip_address?: string | null
          method?: string
          request_body?: Json | null
          response_body?: Json | null
          response_status?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_clients: {
        Row: {
          cnpj: string | null
          company_name: string
          created_at: string | null
          default_pickup_cep: string | null
          default_pickup_city: string | null
          default_pickup_complement: string | null
          default_pickup_neighborhood: string | null
          default_pickup_number: string | null
          default_pickup_state: string | null
          default_pickup_street: string | null
          email: string
          id: string
          is_active: boolean | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cnpj?: string | null
          company_name: string
          created_at?: string | null
          default_pickup_cep?: string | null
          default_pickup_city?: string | null
          default_pickup_complement?: string | null
          default_pickup_neighborhood?: string | null
          default_pickup_number?: string | null
          default_pickup_state?: string | null
          default_pickup_street?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cnpj?: string | null
          company_name?: string
          created_at?: string | null
          default_pickup_cep?: string | null
          default_pickup_city?: string | null
          default_pickup_complement?: string | null
          default_pickup_neighborhood?: string | null
          default_pickup_number?: string | null
          default_pickup_state?: string | null
          default_pickup_street?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      b2b_delivery_addresses: {
        Row: {
          b2b_client_id: string
          cep: string
          city: string
          complement: string | null
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          neighborhood: string
          number: string
          recipient_document: string | null
          recipient_name: string
          recipient_phone: string
          reference: string | null
          state: string
          street: string
          updated_at: string
        }
        Insert: {
          b2b_client_id: string
          cep: string
          city: string
          complement?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          neighborhood: string
          number: string
          recipient_document?: string | null
          recipient_name: string
          recipient_phone: string
          reference?: string | null
          state: string
          street: string
          updated_at?: string
        }
        Update: {
          b2b_client_id?: string
          cep?: string
          city?: string
          complement?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          neighborhood?: string
          number?: string
          recipient_document?: string | null
          recipient_name?: string
          recipient_phone?: string
          reference?: string | null
          state?: string
          street?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_delivery_addresses_b2b_client_id_fkey"
            columns: ["b2b_client_id"]
            isOneToOne: false
            referencedRelation: "b2b_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_pickup_addresses: {
        Row: {
          b2b_client_id: string
          cep: string
          city: string
          complement: string | null
          contact_name: string
          contact_phone: string
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          neighborhood: string
          number: string
          reference: string | null
          state: string
          street: string
          updated_at: string
        }
        Insert: {
          b2b_client_id: string
          cep: string
          city: string
          complement?: string | null
          contact_name: string
          contact_phone: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          neighborhood: string
          number: string
          reference?: string | null
          state: string
          street: string
          updated_at?: string
        }
        Update: {
          b2b_client_id?: string
          cep?: string
          city?: string
          complement?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          neighborhood?: string
          number?: string
          reference?: string | null
          state?: string
          street?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_pickup_addresses_b2b_client_id_fkey"
            columns: ["b2b_client_id"]
            isOneToOne: false
            referencedRelation: "b2b_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_shipments: {
        Row: {
          b2b_client_id: string
          created_at: string | null
          delivery_date: string | null
          delivery_type: string | null
          id: string
          is_volume: boolean | null
          motorista_id: string | null
          observations: string | null
          package_type: string | null
          parent_shipment_id: string | null
          pickup_requested_at: string | null
          recipient_cep: string | null
          recipient_city: string | null
          recipient_complement: string | null
          recipient_name: string | null
          recipient_neighborhood: string | null
          recipient_number: string | null
          recipient_phone: string | null
          recipient_state: string | null
          recipient_street: string | null
          shipment_id: string | null
          status: string
          tracking_code: string | null
          updated_at: string | null
          volume_count: number | null
          volume_eti_code: string | null
          volume_number: number | null
          volume_weight: number | null
        }
        Insert: {
          b2b_client_id: string
          created_at?: string | null
          delivery_date?: string | null
          delivery_type?: string | null
          id?: string
          is_volume?: boolean | null
          motorista_id?: string | null
          observations?: string | null
          package_type?: string | null
          parent_shipment_id?: string | null
          pickup_requested_at?: string | null
          recipient_cep?: string | null
          recipient_city?: string | null
          recipient_complement?: string | null
          recipient_name?: string | null
          recipient_neighborhood?: string | null
          recipient_number?: string | null
          recipient_phone?: string | null
          recipient_state?: string | null
          recipient_street?: string | null
          shipment_id?: string | null
          status?: string
          tracking_code?: string | null
          updated_at?: string | null
          volume_count?: number | null
          volume_eti_code?: string | null
          volume_number?: number | null
          volume_weight?: number | null
        }
        Update: {
          b2b_client_id?: string
          created_at?: string | null
          delivery_date?: string | null
          delivery_type?: string | null
          id?: string
          is_volume?: boolean | null
          motorista_id?: string | null
          observations?: string | null
          package_type?: string | null
          parent_shipment_id?: string | null
          pickup_requested_at?: string | null
          recipient_cep?: string | null
          recipient_city?: string | null
          recipient_complement?: string | null
          recipient_name?: string | null
          recipient_neighborhood?: string | null
          recipient_number?: string | null
          recipient_phone?: string | null
          recipient_state?: string | null
          recipient_street?: string | null
          shipment_id?: string | null
          status?: string
          tracking_code?: string | null
          updated_at?: string | null
          volume_count?: number | null
          volume_eti_code?: string | null
          volume_number?: number | null
          volume_weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_shipments_b2b_client_id_fkey"
            columns: ["b2b_client_id"]
            isOneToOne: false
            referencedRelation: "b2b_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_shipments_parent_shipment_id_fkey"
            columns: ["parent_shipment_id"]
            isOneToOne: false
            referencedRelation: "b2b_shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_shipments_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_volume_labels: {
        Row: {
          b2b_shipment_id: string
          created_at: string
          eti_code: string
          eti_sequence_number: number
          id: string
          volume_number: number
        }
        Insert: {
          b2b_shipment_id: string
          created_at?: string
          eti_code: string
          eti_sequence_number: number
          id?: string
          volume_number: number
        }
        Update: {
          b2b_shipment_id?: string
          created_at?: string
          eti_code?: string
          eti_sequence_number?: number
          id?: string
          volume_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "b2b_volume_labels_b2b_shipment_id_fkey"
            columns: ["b2b_shipment_id"]
            isOneToOne: false
            referencedRelation: "b2b_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      cd_users: {
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
      company_branches: {
        Row: {
          active: boolean | null
          cep: string
          cfop_comercio_dentro_estado: string | null
          cfop_comercio_fora_estado: string | null
          cfop_industria_dentro_estado: string | null
          cfop_industria_fora_estado: string | null
          city: string
          cnpj: string
          complement: string | null
          created_at: string
          email: string | null
          fantasy_name: string | null
          id: string
          inscricao_estadual: string | null
          is_main_branch: boolean | null
          name: string
          neighborhood: string
          number: string
          phone: string | null
          rntrc: string | null
          state: string
          street: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          cep: string
          cfop_comercio_dentro_estado?: string | null
          cfop_comercio_fora_estado?: string | null
          cfop_industria_dentro_estado?: string | null
          cfop_industria_fora_estado?: string | null
          city: string
          cnpj: string
          complement?: string | null
          created_at?: string
          email?: string | null
          fantasy_name?: string | null
          id?: string
          inscricao_estadual?: string | null
          is_main_branch?: boolean | null
          name: string
          neighborhood: string
          number: string
          phone?: string | null
          rntrc?: string | null
          state: string
          street: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          cep?: string
          cfop_comercio_dentro_estado?: string | null
          cfop_comercio_fora_estado?: string | null
          cfop_industria_dentro_estado?: string | null
          cfop_industria_fora_estado?: string | null
          city?: string
          cnpj?: string
          complement?: string | null
          created_at?: string
          email?: string | null
          fantasy_name?: string | null
          id?: string
          inscricao_estadual?: string | null
          is_main_branch?: boolean | null
          name?: string
          neighborhood?: string
          number?: string
          phone?: string | null
          rntrc?: string | null
          state?: string
          street?: string
          updated_at?: string
        }
        Relationships: []
      }
      cte_emissoes: {
        Row: {
          chave_cte: string
          created_at: string
          dacte_url: string | null
          epec: boolean | null
          id: string
          modelo: string
          motivo: string | null
          numero_cte: string
          payload_bruto: Json | null
          remessa_id: string
          serie: string
          shipment_id: string | null
          status: string
          updated_at: string
          uuid_cte: string
          xml_url: string | null
        }
        Insert: {
          chave_cte: string
          created_at?: string
          dacte_url?: string | null
          epec?: boolean | null
          id?: string
          modelo: string
          motivo?: string | null
          numero_cte: string
          payload_bruto?: Json | null
          remessa_id: string
          serie: string
          shipment_id?: string | null
          status: string
          updated_at?: string
          uuid_cte: string
          xml_url?: string | null
        }
        Update: {
          chave_cte?: string
          created_at?: string
          dacte_url?: string | null
          epec?: boolean | null
          id?: string
          modelo?: string
          motivo?: string | null
          numero_cte?: string
          payload_bruto?: Json | null
          remessa_id?: string
          serie?: string
          shipment_id?: string | null
          status?: string
          updated_at?: string
          uuid_cte?: string
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cte_emissoes_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_additionals: {
        Row: {
          calculation_method: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          type: string
          updated_at: string
          value: number
          weight_range_max: number | null
          weight_range_min: number | null
        }
        Insert: {
          calculation_method: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          type: string
          updated_at?: string
          value: number
          weight_range_max?: number | null
          weight_range_min?: number | null
        }
        Update: {
          calculation_method?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
          value?: number
          weight_range_max?: number | null
          weight_range_min?: number | null
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
      jadlog_preco: {
        Row: {
          created_at: string
          id: number
          peso_max: number | null
          peso_min: number | null
          regiao_nome: string | null
          transportadora_id: string | null
          uf_destino: string | null
          valor_frete: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          peso_max?: number | null
          peso_min?: number | null
          regiao_nome?: string | null
          transportadora_id?: string | null
          uf_destino?: string | null
          valor_frete?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          peso_max?: number | null
          peso_min?: number | null
          regiao_nome?: string | null
          transportadora_id?: string | null
          uf_destino?: string | null
          valor_frete?: number | null
        }
        Relationships: []
      }
      jadlog_zones: {
        Row: {
          cep_end: string | null
          cep_start: string | null
          created_at: string
          delivery_days: number | null
          express_delivery_days: number | null
          id: string
          state: string
          tariff_type: string
          updated_at: string
          zone_code: string
          zone_type: string
        }
        Insert: {
          cep_end?: string | null
          cep_start?: string | null
          created_at?: string
          delivery_days?: number | null
          express_delivery_days?: number | null
          id?: string
          state: string
          tariff_type: string
          updated_at?: string
          zone_code: string
          zone_type: string
        }
        Update: {
          cep_end?: string | null
          cep_start?: string | null
          created_at?: string
          delivery_days?: number | null
          express_delivery_days?: number | null
          id?: string
          state?: string
          tariff_type?: string
          updated_at?: string
          zone_code?: string
          zone_type?: string
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
          tipo_pedidos: string
          updated_at: string
          ve_b2b_coleta: boolean | null
          ve_b2b_entrega: boolean | null
          ve_convencional: boolean | null
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
          tipo_pedidos?: string
          updated_at?: string
          ve_b2b_coleta?: boolean | null
          ve_b2b_entrega?: boolean | null
          ve_convencional?: boolean | null
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
          tipo_pedidos?: string
          updated_at?: string
          ve_b2b_coleta?: boolean | null
          ve_b2b_entrega?: boolean | null
          ve_convencional?: boolean | null
        }
        Relationships: []
      }
      pricing_tables: {
        Row: {
          ad_valorem_percentage: number | null
          alfa_chemical_classes: string | null
          alfa_cubic_weight_reference: number | null
          alfa_distance_multiplier: number | null
          alfa_distance_threshold_km: number | null
          alfa_weight_fraction_charge: number | null
          alfa_weight_fraction_kg: number | null
          chemical_classes_enabled: boolean | null
          cnpj: string | null
          company_branch_id: string | null
          created_at: string
          cubic_meter_kg_equivalent: number | null
          distance_multiplier_threshold_km: number | null
          distance_multiplier_value: number | null
          excess_weight_charge_per_kg: number | null
          excess_weight_threshold_kg: number | null
          file_url: string | null
          google_sheets_url: string | null
          gris_percentage: number | null
          id: string
          is_active: boolean
          last_validation_at: string | null
          max_dimension_sum_cm: number | null
          max_height_cm: number | null
          max_length_cm: number | null
          max_width_cm: number | null
          name: string
          peso_adicional_30_50kg: number | null
          peso_adicional_acima_50kg: number | null
          sheet_name: string | null
          source_type: string
          transports_chemical_classes: string | null
          updated_at: string
          validation_errors: Json | null
          validation_status: string | null
        }
        Insert: {
          ad_valorem_percentage?: number | null
          alfa_chemical_classes?: string | null
          alfa_cubic_weight_reference?: number | null
          alfa_distance_multiplier?: number | null
          alfa_distance_threshold_km?: number | null
          alfa_weight_fraction_charge?: number | null
          alfa_weight_fraction_kg?: number | null
          chemical_classes_enabled?: boolean | null
          cnpj?: string | null
          company_branch_id?: string | null
          created_at?: string
          cubic_meter_kg_equivalent?: number | null
          distance_multiplier_threshold_km?: number | null
          distance_multiplier_value?: number | null
          excess_weight_charge_per_kg?: number | null
          excess_weight_threshold_kg?: number | null
          file_url?: string | null
          google_sheets_url?: string | null
          gris_percentage?: number | null
          id?: string
          is_active?: boolean
          last_validation_at?: string | null
          max_dimension_sum_cm?: number | null
          max_height_cm?: number | null
          max_length_cm?: number | null
          max_width_cm?: number | null
          name: string
          peso_adicional_30_50kg?: number | null
          peso_adicional_acima_50kg?: number | null
          sheet_name?: string | null
          source_type: string
          transports_chemical_classes?: string | null
          updated_at?: string
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Update: {
          ad_valorem_percentage?: number | null
          alfa_chemical_classes?: string | null
          alfa_cubic_weight_reference?: number | null
          alfa_distance_multiplier?: number | null
          alfa_distance_threshold_km?: number | null
          alfa_weight_fraction_charge?: number | null
          alfa_weight_fraction_kg?: number | null
          chemical_classes_enabled?: boolean | null
          cnpj?: string | null
          company_branch_id?: string | null
          created_at?: string
          cubic_meter_kg_equivalent?: number | null
          distance_multiplier_threshold_km?: number | null
          distance_multiplier_value?: number | null
          excess_weight_charge_per_kg?: number | null
          excess_weight_threshold_kg?: number | null
          file_url?: string | null
          google_sheets_url?: string | null
          gris_percentage?: number | null
          id?: string
          is_active?: boolean
          last_validation_at?: string | null
          max_dimension_sum_cm?: number | null
          max_height_cm?: number | null
          max_length_cm?: number | null
          max_width_cm?: number | null
          name?: string
          peso_adicional_30_50kg?: number | null
          peso_adicional_acima_50kg?: number | null
          sheet_name?: string | null
          source_type?: string
          transports_chemical_classes?: string | null
          updated_at?: string
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_tables_company_branch_id_fkey"
            columns: ["company_branch_id"]
            isOneToOne: false
            referencedRelation: "company_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          document: string | null
          email: string | null
          first_name: string | null
          id: string
          inscricao_estadual: string | null
          last_name: string | null
          phone: string | null
          tipo_cliente: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          inscricao_estadual?: string | null
          last_name?: string | null
          phone?: string | null
          tipo_cliente?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          inscricao_estadual?: string | null
          last_name?: string | null
          phone?: string | null
          tipo_cliente?: string | null
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
          inscricao_estadual: string | null
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
          inscricao_estadual?: string | null
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
          inscricao_estadual?: string | null
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
          inscricao_estadual: string | null
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
          inscricao_estadual?: string | null
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
          inscricao_estadual?: string | null
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
      shipment_occurrences: {
        Row: {
          created_at: string
          description: string | null
          file_url: string
          id: string
          motorista_id: string | null
          occurrence_type: string
          shipment_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_url: string
          id?: string
          motorista_id?: string | null
          occurrence_type: string
          shipment_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_url?: string
          id?: string
          motorista_id?: string | null
          occurrence_type?: string
          shipment_id?: string
        }
        Relationships: []
      }
      shipment_status_history: {
        Row: {
          b2b_shipment_id: string | null
          created_at: string
          id: string
          motorista_id: string | null
          observacoes: string | null
          occurrence_data: Json | null
          shipment_id: string | null
          status: string
          status_description: string | null
        }
        Insert: {
          b2b_shipment_id?: string | null
          created_at?: string
          id?: string
          motorista_id?: string | null
          observacoes?: string | null
          occurrence_data?: Json | null
          shipment_id?: string | null
          status: string
          status_description?: string | null
        }
        Update: {
          b2b_shipment_id?: string | null
          created_at?: string
          id?: string
          motorista_id?: string | null
          observacoes?: string | null
          occurrence_data?: Json | null
          shipment_id?: string | null
          status?: string
          status_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_status_history_b2b_shipment_id_fkey"
            columns: ["b2b_shipment_id"]
            isOneToOne: false
            referencedRelation: "b2b_shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_status_history_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          created_at: string
          cte_key: string | null
          document_type: string | null
          format: string
          height: number
          id: string
          label_pdf_url: string | null
          length: number
          motorista_id: string | null
          origem: string | null
          payment_data: Json | null
          pickup_option: string
          pricing_table_id: string | null
          pricing_table_name: string | null
          quote_data: Json
          recipient_address_id: string
          selected_option: string
          sender_address_id: string
          session_id: string | null
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
          document_type?: string | null
          format: string
          height: number
          id?: string
          label_pdf_url?: string | null
          length: number
          motorista_id?: string | null
          origem?: string | null
          payment_data?: Json | null
          pickup_option: string
          pricing_table_id?: string | null
          pricing_table_name?: string | null
          quote_data: Json
          recipient_address_id: string
          selected_option: string
          sender_address_id: string
          session_id?: string | null
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
          document_type?: string | null
          format?: string
          height?: number
          id?: string
          label_pdf_url?: string | null
          length?: number
          motorista_id?: string | null
          origem?: string | null
          payment_data?: Json | null
          pickup_option?: string
          pricing_table_id?: string | null
          pricing_table_name?: string | null
          quote_data?: Json
          recipient_address_id?: string
          selected_option?: string
          sender_address_id?: string
          session_id?: string | null
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
            foreignKeyName: "shipments_pricing_table_id_fkey"
            columns: ["pricing_table_id"]
            isOneToOne: false
            referencedRelation: "pricing_tables"
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
      shipping_pricing_magalog: {
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
            referencedRelation: "shipping_zones_magalog"
            referencedColumns: ["zone_code"]
          },
        ]
      }
      shipping_zones_magalog: {
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
      temp_quotes: {
        Row: {
          created_at: string
          expires_at: string
          external_id: string
          id: string
          package_data: Json
          quote_options: Json
          recipient_data: Json
          sender_data: Json
          session_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          external_id: string
          id?: string
          package_data: Json
          quote_options: Json
          recipient_data: Json
          sender_data: Json
          session_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          external_id?: string
          id?: string
          package_data?: Json
          quote_options?: Json
          recipient_data?: Json
          sender_data?: Json
          session_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
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
      safe_tracking_view: {
        Row: {
          delivered_date: string | null
          estimated_delivery: string | null
          shipped_date: string | null
          status: string | null
          status_description: string | null
          tracking_code: string | null
        }
        Insert: {
          delivered_date?: never
          estimated_delivery?: never
          shipped_date?: never
          status?: string | null
          status_description?: never
          tracking_code?: string | null
        }
        Update: {
          delivered_date?: never
          estimated_delivery?: never
          shipped_date?: never
          status?: string | null
          status_description?: never
          tracking_code?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_shipment: {
        Args: { p_motorista_uuid?: string; p_shipment_id: string }
        Returns: Json
      }
      authenticate_cd_user: {
        Args: { p_email: string; p_password: string }
        Returns: {
          email: string
          id: string
          nome: string
          status: string
          telefone: string
        }[]
      }
      authenticate_motorista: {
        Args: { input_email: string; input_password: string }
        Returns: Json
      }
      authenticate_motorista_secure: {
        Args: { p_email: string; p_password: string }
        Returns: {
          email: string
          id: string
          nome: string
          status: string
          telefone: string
        }[]
      }
      bytea_to_text: { Args: { data: string }; Returns: string }
      check_rate_limit: {
        Args: {
          action_type: string
          client_ip: string
          max_attempts?: number
          time_window_minutes?: number
        }
        Returns: boolean
      }
      check_rate_limit_secure: {
        Args: {
          action_type: string
          client_identifier: string
          max_attempts?: number
          time_window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_anonymous_addresses: { Args: never; Returns: undefined }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      cleanup_expired_temp_quotes: { Args: never; Returns: undefined }
      cleanup_old_security_logs: { Args: never; Returns: undefined }
      cleanup_orphaned_anonymous_shipments: { Args: never; Returns: undefined }
      cleanup_security_logs: { Args: never; Returns: undefined }
      create_anonymous_session: {
        Args: { client_fingerprint?: string }
        Returns: {
          session_id: string
          session_token: string
        }[]
      }
      create_eti_codes_for_shipment: {
        Args: { p_b2b_shipment_id: string; p_volume_count: number }
        Returns: {
          eti_code: string
          eti_sequence_number: number
          volume_number: number
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
      delete_user_admin: {
        Args: { user_id_to_delete: string }
        Returns: undefined
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
      generate_api_key: { Args: never; Returns: string }
      generate_b2b_tracking_code: { Args: never; Returns: string }
      generate_eti_codes_for_shipment: {
        Args: { p_b2b_shipment_id: string; p_volume_count: number }
        Returns: {
          eti_code: string
          eti_sequence_number: number
          volume_number: number
        }[]
      }
      generate_tracking_code: { Args: never; Returns: string }
      get_available_shipments: {
        Args: never
        Returns: {
          created_at: string
          cte_key: string
          format: string
          height: number
          id: string
          label_pdf_url: string
          length: number
          payment_data: Json
          pickup_option: string
          quote_data: Json
          recipient_address: Json
          selected_option: string
          sender_address: Json
          status: string
          tracking_code: string
          weight: number
          width: number
        }[]
      }
      get_b2b_client_stats: {
        Args: { client_id: string }
        Returns: {
          completed_shipments: number
          in_transit_shipments: number
          month_shipments: number
          pending_shipments: number
          total_shipments: number
        }[]
      }
      get_current_session_id: { Args: never; Returns: string }
      get_masked_personal_data: {
        Args: { address_ref: string }
        Returns: {
          email_domain: string
          masked_document: string
          masked_phone: string
        }[]
      }
      get_motorista_shipments: {
        Args: { motorista_uuid: string }
        Returns: {
          created_at: string
          cte_key: string
          format: string
          height: number
          id: string
          label_pdf_url: string
          length: number
          payment_data: Json
          pickup_option: string
          quote_data: Json
          recipient_address: Json
          selected_option: string
          sender_address: Json
          status: string
          tracking_code: string
          weight: number
          width: number
        }[]
      }
      get_motorista_shipments_public: {
        Args: { motorista_uuid?: string }
        Returns: {
          created_at: string
          cte_key: string
          format: string
          height: number
          id: string
          label_pdf_url: string
          length: number
          payment_data: Json
          pickup_option: string
          quote_data: Json
          recipient_address: Json
          selected_option: string
          sender_address: Json
          status: string
          tracking_code: string
          weight: number
          width: number
        }[]
      }
      get_secure_integrations: {
        Args: never
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
      hash_password: { Args: { password: string }; Returns: string }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      is_ip_blocked: { Args: { client_ip: string }; Returns: boolean }
      is_motorista: { Args: { _user_id: string }; Returns: boolean }
      list_security_definer_functions: {
        Args: never
        Returns: {
          comment: string
          function_name: string
          schema_name: string
          security_mode: string
        }[]
      }
      log_sensitive_access: {
        Args: {
          action_type: string
          record_id: string
          table_name: string
          user_id?: string
        }
        Returns: undefined
      }
      manual_company_branch_webhook_dispatch: {
        Args: { branch_uuid: string; webhook_event_type?: string }
        Returns: Json
      }
      manual_dispatch_webhook_by_tracking_code: {
        Args: { p_tracking_code: string }
        Returns: Json
      }
      manual_webhook_dispatch: {
        Args: { shipment_uuid: string }
        Returns: Json
      }
      monitor_security_events: {
        Args: never
        Returns: {
          event_count: number
          event_type: string
          last_occurrence: string
          unique_ips: number
        }[]
      }
      promote_to_admin: { Args: { user_email: string }; Returns: undefined }
      register_cd_user: {
        Args: {
          p_cpf: string
          p_email: string
          p_nome: string
          p_senha: string
          p_telefone: string
        }
        Returns: Json
      }
      register_motorista_public: {
        Args: {
          p_cpf: string
          p_email: string
          p_nome: string
          p_senha: string
          p_telefone: string
        }
        Returns: Json
      }
      test_insert_occurrence: {
        Args: {
          p_description?: string
          p_file_url: string
          p_motorista_id: string
          p_occurrence_type: string
          p_shipment_id: string
        }
        Returns: Json
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      validate_anonymous_session: {
        Args: { session_token: string }
        Returns: string
      }
      validate_api_key: {
        Args: { p_api_key: string }
        Returns: {
          company_name: string
          is_valid: boolean
          key_id: string
          rate_limit_per_hour: number
        }[]
      }
      validate_input_security: {
        Args: { input_text: string }
        Returns: boolean
      }
      validate_secure_tracking_request: {
        Args: { client_ip?: string; tracking_code: string }
        Returns: boolean
      }
      validate_session_with_rate_limiting: {
        Args: { client_ip?: string; session_token: string }
        Returns: string
      }
      validate_session_with_security_monitoring: {
        Args: { client_ip?: string; session_token: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user" | "motorista"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
      app_role: ["admin", "user", "motorista"],
    },
  },
} as const
