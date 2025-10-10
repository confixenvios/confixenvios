-- Criar tabelas para dados da transportadora Alfa
CREATE TABLE IF NOT EXISTS public.alfa_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  origin_state TEXT NOT NULL DEFAULT 'GO',
  destination_state TEXT NOT NULL,
  tariff_type TEXT NOT NULL DEFAULT 'STANDARD',
  weight_min NUMERIC NOT NULL,
  weight_max NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alfa_zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_code TEXT NOT NULL,
  state TEXT NOT NULL,
  zone_type TEXT NOT NULL DEFAULT 'STANDARD',
  tariff_type TEXT NOT NULL DEFAULT 'STANDARD',
  cep_start TEXT,
  cep_end TEXT,
  delivery_days INTEGER NOT NULL DEFAULT 5,
  express_delivery_days INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_alfa_pricing_destination ON public.alfa_pricing(destination_state);
CREATE INDEX IF NOT EXISTS idx_alfa_pricing_weight ON public.alfa_pricing(weight_min, weight_max);
CREATE INDEX IF NOT EXISTS idx_alfa_zones_state ON public.alfa_zones(state);
CREATE INDEX IF NOT EXISTS idx_alfa_zones_cep ON public.alfa_zones(cep_start, cep_end);

-- RLS Policies
ALTER TABLE public.alfa_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alfa_zones ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar tudo
CREATE POLICY "Admins can manage alfa pricing" ON public.alfa_pricing
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage alfa zones" ON public.alfa_zones
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Usuários autenticados podem ler
CREATE POLICY "Authenticated users can view alfa pricing" ON public.alfa_pricing
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view alfa zones" ON public.alfa_zones
  FOR SELECT USING (true);

COMMENT ON TABLE public.alfa_pricing IS 'Tabela de preços da transportadora Alfa';
COMMENT ON TABLE public.alfa_zones IS 'Tabela de zonas e prazos de entrega da transportadora Alfa';