-- Primeiro, remover a constraint existente
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS shipments_status_check;

-- Adicionar a nova constraint com todos os status necessários
ALTER TABLE public.shipments ADD CONSTRAINT shipments_status_check 
CHECK (status = ANY (ARRAY[
  'PENDING_LABEL'::text, 
  'PENDING_DOCUMENT'::text, 
  'PENDING_PAYMENT'::text, 
  'PAYMENT_CONFIRMED'::text, 
  'PAID'::text, 
  'CTE_EMITTED'::text, 
  'COLLECTED'::text, 
  'IN_TRANSIT'::text, 
  'OUT_FOR_DELIVERY'::text, 
  'DELIVERED'::text, 
  'CANCELLED'::text, 
  'PAGO_AGUARDANDO_ETIQUETA'::text, 
  'AWAITING_LABEL'::text, 
  'LABEL_AVAILABLE'::text,
  -- Novos status para o motorista
  'COLETA_ACEITA'::text,
  'COLETA_FINALIZADA'::text,
  'EM_TRANSITO'::text,
  'TENTATIVA_ENTREGA'::text,
  'ENTREGA_FINALIZADA'::text,
  'AGUARDANDO_DESTINATARIO'::text,
  'ENDERECO_INCORRETO'::text
]));