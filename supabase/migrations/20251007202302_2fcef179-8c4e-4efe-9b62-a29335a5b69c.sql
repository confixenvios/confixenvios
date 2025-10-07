-- Garantir que a tabela jadlog_pricing existe com as colunas corretas
CREATE TABLE IF NOT EXISTS public.jadlog_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_state TEXT NOT NULL,
  destination_state TEXT NOT NULL,
  tariff_type TEXT NOT NULL,
  weight_min NUMERIC NOT NULL,
  weight_max NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.jadlog_pricing ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Admins can manage jadlog pricing" ON public.jadlog_pricing;
DROP POLICY IF EXISTS "Authenticated users can view jadlog pricing" ON public.jadlog_pricing;
DROP POLICY IF EXISTS "System can insert jadlog pricing" ON public.jadlog_pricing;

-- Criar políticas RLS
-- Admins podem fazer tudo
CREATE POLICY "Admins can manage jadlog pricing"
ON public.jadlog_pricing
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Sistema pode inserir (para a importação)
CREATE POLICY "System can insert jadlog pricing"
ON public.jadlog_pricing
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Todos usuários autenticados podem visualizar
CREATE POLICY "Authenticated users can view jadlog pricing"
ON public.jadlog_pricing
FOR SELECT
TO authenticated
USING (true);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_jadlog_pricing_origin_dest 
ON public.jadlog_pricing(origin_state, destination_state);

CREATE INDEX IF NOT EXISTS idx_jadlog_pricing_weight 
ON public.jadlog_pricing(weight_min, weight_max);

CREATE INDEX IF NOT EXISTS idx_jadlog_pricing_tariff 
ON public.jadlog_pricing(tariff_type);