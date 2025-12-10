-- Remover a FK que impede inserção de IDs de b2b_shipments
ALTER TABLE public.shipment_status_history 
DROP CONSTRAINT IF EXISTS shipment_status_history_shipment_id_fkey;

-- Tornar shipment_id nullable para permitir tanto shipments quanto b2b_shipments
ALTER TABLE public.shipment_status_history 
ALTER COLUMN shipment_id DROP NOT NULL;

-- Adicionar coluna b2b_shipment_id para referência explícita a remessas B2B
ALTER TABLE public.shipment_status_history 
ADD COLUMN IF NOT EXISTS b2b_shipment_id uuid REFERENCES public.b2b_shipments(id);

-- Criar índices para busca eficiente
CREATE INDEX IF NOT EXISTS idx_shipment_status_history_b2b_shipment_id 
ON public.shipment_status_history(b2b_shipment_id);

-- Adicionar constraint CHECK para garantir que pelo menos um dos IDs esteja preenchido
ALTER TABLE public.shipment_status_history 
ADD CONSTRAINT check_shipment_or_b2b_required 
CHECK (shipment_id IS NOT NULL OR b2b_shipment_id IS NOT NULL);