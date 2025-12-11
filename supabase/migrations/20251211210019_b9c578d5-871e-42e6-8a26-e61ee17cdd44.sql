-- Atualizar constraint de status B2B para incluir todos os status do novo fluxo
ALTER TABLE public.b2b_shipments DROP CONSTRAINT IF EXISTS b2b_shipments_status_check;

ALTER TABLE public.b2b_shipments ADD CONSTRAINT b2b_shipments_status_check 
CHECK (status = ANY (ARRAY[
  'PENDENTE'::text, 
  'ACEITA'::text, 
  'EM_ROTA'::text, 
  'B2B_COLETA_PENDENTE'::text,
  'B2B_COLETA_ACEITA'::text,
  'B2B_NO_CD'::text,
  'B2B_VOLUME_DISPONIVEL'::text,
  'B2B_VOLUME_ACEITO'::text,
  'B2B_DESMEMBRADA'::text,
  'B2B_COLETA_FINALIZADA'::text, 
  'B2B_ENTREGA_ACEITA'::text, 
  'ENTREGUE'::text, 
  'CANCELADA'::text
]));