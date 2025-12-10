-- Adicionar flags de visibilidade de remessas na tabela motoristas
ALTER TABLE public.motoristas 
ADD COLUMN IF NOT EXISTS ve_convencional boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS ve_b2b_coleta boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ve_b2b_entrega boolean DEFAULT false;

-- Comentários nas colunas para documentação
COMMENT ON COLUMN public.motoristas.ve_convencional IS 'Motorista pode ver remessas convencionais (fluxo único coleta-entrega)';
COMMENT ON COLUMN public.motoristas.ve_b2b_coleta IS 'Motorista pode ver B2B em fase 1 - coleta inicial após pagamento';
COMMENT ON COLUMN public.motoristas.ve_b2b_entrega IS 'Motorista pode ver B2B em fase 2 - entrega final após coleta finalizada';