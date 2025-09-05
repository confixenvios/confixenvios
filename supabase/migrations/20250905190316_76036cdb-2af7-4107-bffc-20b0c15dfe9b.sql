-- Atualizar a constraint de status da tabela shipments para incluir PAYMENT_CONFIRMED
ALTER TABLE public.shipments 
DROP CONSTRAINT IF EXISTS shipments_status_check;

-- Adicionar nova constraint com PAYMENT_CONFIRMED incluído
ALTER TABLE public.shipments 
ADD CONSTRAINT shipments_status_check 
CHECK (status = ANY (ARRAY[
  'PENDING_LABEL'::text, 
  'PENDING_DOCUMENT'::text, 
  'PENDING_PAYMENT'::text, 
  'PAYMENT_CONFIRMED'::text,  -- Adicionado este status
  'PAID'::text, 
  'CTE_EMITTED'::text, 
  'COLLECTED'::text, 
  'IN_TRANSIT'::text, 
  'OUT_FOR_DELIVERY'::text, 
  'DELIVERED'::text, 
  'CANCELLED'::text,
  'PAGO_AGUARDANDO_ETIQUETA'::text,  -- Também usado no código
  'AWAITING_LABEL'::text,           -- Também usado no código
  'LABEL_AVAILABLE'::text           -- Também usado no código
]));