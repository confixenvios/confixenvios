-- Adicionar campos separados para motorista de coleta e entrega
ALTER TABLE public.b2b_shipments 
ADD COLUMN IF NOT EXISTS motorista_coleta_id uuid REFERENCES public.motoristas(id),
ADD COLUMN IF NOT EXISTS motorista_entrega_id uuid REFERENCES public.motoristas(id);

-- Migrar dados existentes: se motorista_id existe, copiar para motorista_coleta_id
UPDATE public.b2b_shipments 
SET motorista_coleta_id = motorista_id 
WHERE motorista_id IS NOT NULL AND motorista_coleta_id IS NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.b2b_shipments.motorista_coleta_id IS 'Motorista responsável pela coleta (B2B-0)';
COMMENT ON COLUMN public.b2b_shipments.motorista_entrega_id IS 'Motorista responsável pela entrega (B2B-2)';