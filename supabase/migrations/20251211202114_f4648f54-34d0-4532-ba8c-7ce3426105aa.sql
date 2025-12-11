-- Adicionar colunas para volumes desmembrados
ALTER TABLE public.b2b_shipments 
ADD COLUMN IF NOT EXISTS parent_shipment_id uuid REFERENCES public.b2b_shipments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_volume boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS volume_eti_code text,
ADD COLUMN IF NOT EXISTS volume_weight numeric,
ADD COLUMN IF NOT EXISTS volume_number integer;

-- Criar índice para parent
CREATE INDEX IF NOT EXISTS idx_b2b_shipments_parent ON public.b2b_shipments(parent_shipment_id) WHERE parent_shipment_id IS NOT NULL;