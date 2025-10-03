-- Tabela para configurações do Agente IA de Cotação
CREATE TABLE public.ai_quote_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT false,
  priority_mode text NOT NULL DEFAULT 'balanced' CHECK (priority_mode IN ('lowest_price', 'fastest_delivery', 'balanced')),
  preferred_carriers jsonb DEFAULT '[]'::jsonb,
  additional_rules text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela para generalidades/adicionais de frete
CREATE TABLE public.freight_additionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('ad_valorem', 'gris', 'insurance', 'weight_fee', 'other')),
  calculation_method text NOT NULL CHECK (calculation_method IN ('percentage', 'fixed')),
  value numeric NOT NULL,
  weight_range_min numeric,
  weight_range_max numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela para auditoria de cotações processadas pelo agente IA
CREATE TABLE public.ai_quote_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  session_id text,
  origin_cep text NOT NULL,
  destination_cep text NOT NULL,
  total_weight numeric NOT NULL,
  total_volume numeric NOT NULL,
  volumes_data jsonb NOT NULL,
  selected_pricing_table_id uuid REFERENCES public.pricing_tables(id),
  selected_pricing_table_name text,
  base_price numeric NOT NULL,
  additionals_applied jsonb DEFAULT '[]'::jsonb,
  final_price numeric NOT NULL,
  delivery_days integer NOT NULL,
  priority_used text NOT NULL,
  all_options_analyzed jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO public.ai_quote_config (priority_mode, is_active) 
VALUES ('balanced', false);

-- RLS Policies
ALTER TABLE public.ai_quote_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freight_additionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_quote_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem gerenciar configurações
CREATE POLICY "Admins can manage AI quote config"
ON public.ai_quote_config
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Apenas admins podem gerenciar adicionais
CREATE POLICY "Admins can manage freight additionals"
ON public.freight_additionals
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins podem ver todos os logs, usuários apenas os seus
CREATE POLICY "Admins can view all AI quote logs"
ON public.ai_quote_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own AI quote logs"
ON public.ai_quote_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Sistema pode inserir logs
CREATE POLICY "System can insert AI quote logs"
ON public.ai_quote_logs
FOR INSERT
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_ai_quote_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_ai_quote_config_updated_at
BEFORE UPDATE ON public.ai_quote_config
FOR EACH ROW
EXECUTE FUNCTION public.update_ai_quote_config_updated_at();

CREATE TRIGGER update_freight_additionals_updated_at
BEFORE UPDATE ON public.freight_additionals
FOR EACH ROW
EXECUTE FUNCTION public.update_ai_quote_config_updated_at();