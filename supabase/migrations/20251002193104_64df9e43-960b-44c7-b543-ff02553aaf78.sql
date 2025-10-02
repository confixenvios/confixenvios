-- Alterar campos da tabela b2b_shipments para permitir fluxo simplificado de coleta
ALTER TABLE public.b2b_shipments 
ALTER COLUMN recipient_name DROP NOT NULL,
ALTER COLUMN recipient_phone DROP NOT NULL,
ALTER COLUMN recipient_cep DROP NOT NULL,
ALTER COLUMN recipient_street DROP NOT NULL,
ALTER COLUMN recipient_number DROP NOT NULL,
ALTER COLUMN recipient_neighborhood DROP NOT NULL,
ALTER COLUMN recipient_city DROP NOT NULL,
ALTER COLUMN recipient_state DROP NOT NULL,
ALTER COLUMN delivery_type DROP NOT NULL;

-- Adicionar novos campos para o fluxo simplificado
ALTER TABLE public.b2b_shipments
ADD COLUMN IF NOT EXISTS volume_count integer,
ADD COLUMN IF NOT EXISTS delivery_date date,
ADD COLUMN IF NOT EXISTS pickup_requested_at timestamp with time zone DEFAULT now();

-- Criar índice para melhor performance nas consultas por data
CREATE INDEX IF NOT EXISTS idx_b2b_shipments_delivery_date 
ON public.b2b_shipments(delivery_date);

COMMENT ON COLUMN public.b2b_shipments.volume_count IS 'Número de volumes para coleta';
COMMENT ON COLUMN public.b2b_shipments.delivery_date IS 'Data prevista para entrega dos volumes';
COMMENT ON COLUMN public.b2b_shipments.pickup_requested_at IS 'Data/hora da solicitação de coleta';