-- Criar tabela de zonas Jadlog (similar a shipping_zones)
CREATE TABLE IF NOT EXISTS public.jadlog_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_code TEXT NOT NULL,
  state TEXT NOT NULL,
  zone_type TEXT NOT NULL, -- 'capital' ou 'interior'
  tariff_type TEXT NOT NULL, -- 'CAPITAL 1', 'CAPITAL 2', 'CAPITAL 3', 'INTERIOR 1', etc
  cep_start TEXT,
  cep_end TEXT,
  delivery_days INTEGER DEFAULT 5,
  express_delivery_days INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(state, zone_type, tariff_type)
);

-- Criar tabela de preços Jadlog (similar a shipping_pricing)
CREATE TABLE IF NOT EXISTS public.jadlog_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_state TEXT NOT NULL, -- Estado de origem (ex: 'GO')
  destination_state TEXT NOT NULL, -- Estado de destino (ex: 'SP')
  tariff_type TEXT NOT NULL, -- Tipo de tarifa (ex: 'SP CAPITAL 1')
  weight_min NUMERIC NOT NULL,
  weight_max NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_jadlog_zones_state ON public.jadlog_zones(state);
CREATE INDEX idx_jadlog_zones_zone_type ON public.jadlog_zones(zone_type);
CREATE INDEX idx_jadlog_pricing_origin_dest ON public.jadlog_pricing(origin_state, destination_state);
CREATE INDEX idx_jadlog_pricing_weight ON public.jadlog_pricing(weight_min, weight_max);

-- Habilitar RLS
ALTER TABLE public.jadlog_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jadlog_pricing ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Admins podem gerenciar
CREATE POLICY "Admins can manage jadlog zones"
ON public.jadlog_zones
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage jadlog pricing"
ON public.jadlog_pricing
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Políticas RLS - Usuários autenticados podem visualizar
CREATE POLICY "Authenticated users can view jadlog zones"
ON public.jadlog_zones
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view jadlog pricing"
ON public.jadlog_pricing
FOR SELECT
TO authenticated
USING (true);

COMMENT ON TABLE public.jadlog_zones IS 'Zonas de entrega Jadlog com tipos de tarifa e faixas de CEP';
COMMENT ON TABLE public.jadlog_pricing IS 'Tabela de preços Jadlog por origem, destino, tipo de tarifa e faixa de peso';